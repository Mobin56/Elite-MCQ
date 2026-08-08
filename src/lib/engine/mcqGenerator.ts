import { db } from '../db';
import { callLLM } from '../ai/provider';

interface ContentMap {
  chapterName: string;
  subject: string;
  topics: string[];
  formulas: string[];
  definitions: string[];
  hasDiagrams: boolean;
  hasEquations: boolean;
}

interface GeneratedMCQ {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // A, B, C, D
  explanation: string;
  type: string;          // NUMERICAL, CRITICAL, CONCEPTUAL, STIMULUS, EQUATION, DIAGRAM
  difficulty: string;    // EASY, MEDIUM, HARD
  sourcePage?: string;
  sourceText?: string;
  confidence: number;
}

// Simple Jaccard similarity check to prevent duplicate questions
export function calculateSimilarity(text1: string, text2: string): number {
  const stopWords = new Set([
    'what', 'is', 'the', 'in', 'of', 'a', 'which', 'does', 'do', 'and', 'or', 'for', 'to', 'on', 'with', 'by', 'at', 'an', 'this', 'that',
    'কি', 'হল', 'কোথায়', 'এবং', 'অথবা', 'এর', 'একটি', 'কোন', 'কিভাবে', 'কেন', 'কিভাবে'
  ]);
  
  const tokenize = (text: string) => {
    const normalized = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?""''\-+]/g, ' ');
    return normalized.split(/\s+/).filter(word => word.length > 1 && !stopWords.has(word));
  };

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

export function isDuplicateQuestion(qText: string, existingQuestions: Array<{ question: string }>): boolean {
  for (const eq of existingQuestions) {
    if (calculateSimilarity(qText, eq.question) > 0.35) {
      return true;
    }
  }
  return false;
}

// 1. Content Map Generator
export async function generateContentMap(text: string): Promise<ContentMap> {
  const truncatedText = text.substring(0, 15000);
  const prompt = `You are a curriculum analyst. Read the following text extracted from an educational book chapter and analyze its contents.
Generate a structured JSON Content Map specifying:
1. chapterName: Title of the chapter.
2. subject: Best subject classification (e.g. Physics, Chemistry, Biology, Mathematics, ICT, Bangla, English, General).
3. topics: Array of the main 5-10 key topics or concepts discussed.
4. formulas: Array of mathematical equations or formulas mentioned (empty if none).
5. definitions: Array of key definitions or terms (max 10).
6. hasDiagrams: boolean (true if text refers to figures, images, graphs, or charts).
7. hasEquations: boolean (true if formulas/equations exist in text).

Return ONLY a valid JSON object matching this schema. Do not output anything else besides JSON.

Content text:
"""
${truncatedText}
"""
`;

  try {
    const response = await callLLM(prompt, true);
    // Find JSON block if AI added markdown wrappers
    const cleanJson = response.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson) as ContentMap;
  } catch (error) {
    console.error('Content map analysis failed, using fallback:', error);
    return {
      chapterName: 'Chapter Overview',
      subject: 'General Education',
      topics: ['Main Concepts'],
      formulas: [],
      definitions: [],
      hasDiagrams: false,
      hasEquations: false,
    };
  }
}

// 2. Intelligent Question Type Redistribution
export function adjustDistributionRatios(
  requested: Record<string, number>,
  contentMap: ContentMap
): { adjusted: Record<string, number>; warningLog: string | null } {
  const adjusted = { ...requested };
  let warningLog: string | null = null;
  const warnings: string[] = [];

  const checkAndRedistribute = (category: string, condition: boolean, fallbackText: string) => {
    if (adjusted[category] > 0 && !condition) {
      const amountToRedistribute = adjusted[category];
      adjusted[category] = 0;
      
      // Redistribute evenly into CONCEPTUAL and CRITICAL
      const part = Math.floor(amountToRedistribute / 2);
      const remainder = amountToRedistribute - (part * 2);
      
      adjusted['conceptual'] = (adjusted['conceptual'] || 0) + part + remainder;
      adjusted['critical'] = (adjusted['critical'] || 0) + part;
      
      warnings.push(fallbackText);
    }
  };

  // If no equations/formulas, redistribute EQUATION
  checkAndRedistribute(
    'equation',
    contentMap.hasEquations || contentMap.formulas.length > 0,
    `This chapter contains limited equation/formula content. Equation questions (${requested['equation'] || 10}%) were redistributed to conceptual/critical categories.`
  );

  // If no diagrams mentioned, redistribute DIAGRAM
  checkAndRedistribute(
    'diagram',
    contentMap.hasDiagrams,
    `This chapter contains limited diagram-based content. Diagram questions (${requested['diagram'] || 10}%) were redistributed to conceptual/critical categories.`
  );

  if (warnings.length > 0) {
    warningLog = warnings.join(' \n');
  }

  // Ensure total is exactly 100%
  const total = Object.values(adjusted).reduce((sum, v) => sum + v, 0);
  if (total !== 100 && total > 0) {
    // Add any rounding error to conceptual
    const diff = 100 - total;
    adjusted['conceptual'] = (adjusted['conceptual'] || 0) + diff;
  }

  return { adjusted, warningLog };
}

// 3. AI Generator Core function
export async function generateMCQBatch(
  chapterText: string,
  contentMap: ContentMap,
  quantity: number,
  typesToGenerate: Record<string, number>, // e.g. { numerical: 5, conceptual: 2, etc. }
  difficultyDist: Record<string, number>, // e.g. { easy: 30, medium: 50, hard: 20 }
  language: string,
  existingQuestions: Array<{ question: string }>
): Promise<GeneratedMCQ[]> {
  
  const textSample = chapterText.substring(0, 40000); // Grab up to 40k chars for generation details
  
  const prompt = `You are an expert academic MCQ question generator and examiner. Analyze the following chapter content and details.
Generate exactly ${quantity} high-quality, exam-standard multiple choice questions.

Chapter Title: ${contentMap.chapterName}
Subject: ${contentMap.subject}
Output Language: ${language} (Generate questions, options, correct answers, and explanations entirely in this language. If BANGLA, use standard academic Bengali).

Specific Question Type Counts requested:
${Object.entries(typesToGenerate).map(([t, count]) => `- ${t.toUpperCase()}: ${count} questions`).join('\n')}

Specific Difficulty distribution requested:
- EASY: ${difficultyDist.easy}%
- MEDIUM: ${difficultyDist.medium}%
- HARD: ${difficultyDist.hard}%

Important Guidelines:
1. Every generated MCQ must have 4 options: optionA, optionB, optionC, optionD.
2. Only ONE option must be correct. Specify correctAnswer as "A", "B", "C", or "D".
3. Provide a concise, informative explanation for the correct answer.
4. Every question must be fully answerable from the source content or logically derivable from it. Do not hallucinate or add facts outside the text.
5. Create unique, diverse, and clear question formats. For NUMERICAL/EQUATION, construct correct mathematical calculations and logical distractor choices. For CRITICAL, ask "Why?", "What would happen if?", or "Which statement explains...". For STIMULUS, start the question with a mini scenario/context.
6. Ensure confidence is a float from 0.0 to 1.0.

Return the result as a valid JSON Array of objects matching this TypeScript interface:
interface GeneratedMCQ {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  type: "NUMERICAL" | "CRITICAL" | "CONCEPTUAL" | "STIMULUS" | "EQUATION" | "DIAGRAM";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourcePage?: string;
  sourceText?: string;
  confidence: number;
}

Chapter Content Snippet:
"""
${textSample}
"""

Return ONLY the JSON array. Do not output conversational texts.`;

  try {
    const rawResponse = await callLLM(prompt, true);
    const cleanJson = rawResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const mcqs = JSON.parse(cleanJson) as GeneratedMCQ[];
    
    // Filter duplicates internally
    const uniqueBatch: GeneratedMCQ[] = [];
    const allKnown = [...existingQuestions];

    for (const mcq of mcqs) {
      if (!isDuplicateQuestion(mcq.question, allKnown)) {
        uniqueBatch.push(mcq);
        allKnown.push({ question: mcq.question });
      }
    }

    return uniqueBatch;
  } catch (error) {
    console.error('Batch generation failed:', error);
    return [];
  }
}

// 4. Validator AI QA Pipeline
export async function validateMCQBatch(
  mcqs: GeneratedMCQ[],
  chapterText: string,
  language: string
): Promise<GeneratedMCQ[]> {
  if (mcqs.length === 0) return [];
  
  const prompt = `You are an academic quality assurance inspector. Review these generated multiple-choice questions against the provided source chapter context.
Evaluate each question in the JSON array based on:
1. Is it answerable from the text?
2. Is the specified correct answer accurate?
3. Are there duplicate or overlapping options?
4. Is it grammatically correct in ${language}?

If a question fails any of these criteria, discard it or correct it. Return ONLY the validated/corrected list of questions in the same JSON format. Remove any question that is highly ambiguous or incorrect.

Questions to inspect:
${JSON.stringify(mcqs, null, 2)}

Return ONLY a valid JSON array of validated/corrected MCQ objects.`;

  try {
    const response = await callLLM(prompt, true);
    const cleanJson = response.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson) as GeneratedMCQ[];
  } catch (error) {
    console.error('Batch validation failed, returning original batch:', error);
    return mcqs; // Fallback to original
  }
}
