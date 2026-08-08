import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { callLLM } from '@/lib/ai/provider';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;

  try {
    const originalQ = await db.question.findUnique({
      where: { id },
      include: {
        project: {
          include: { document: true }
        }
      }
    });

    if (!originalQ || originalQ.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const textSample = originalQ.project.document.extractedText.substring(0, 30000);
    const type = originalQ.type;
    const difficulty = originalQ.difficulty;
    const lang = originalQ.project.language;

    const prompt = `You are an expert academic MCQ generator. Analyze the following chapter text.
Generate exactly ONE high-quality, exam-standard multiple-choice question.

Question details:
- Type: ${type}
- Difficulty: ${difficulty}
- Language: ${lang}

Requirements:
1. It must have 4 options: optionA, optionB, optionC, optionD.
2. Only ONE option must be correct. Specify correctAnswer as "A", "B", "C", or "D".
3. Provide a concise explanation.
4. Ensure it is completely answerable from the text.
5. Make it DIFFERENT from the current question: "${originalQ.question}".

Return the result as a valid JSON object matching this schema:
{
  "question": "...",
  "optionA": "...",
  "optionB": "...",
  "optionC": "...",
  "optionD": "...",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "..."
}

Chapter Text:
"""
${textSample}
"""

Return ONLY the JSON object. Do not output anything else.`;

    const rawResponse = await callLLM(prompt, true);
    const cleanJson = rawResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const newQ = JSON.parse(cleanJson);

    const updated = await db.question.update({
      where: { id },
      data: {
        question: newQ.question,
        optionA: newQ.optionA,
        optionB: newQ.optionB,
        optionC: newQ.optionC,
        optionD: newQ.optionD,
        correctAnswer: newQ.correctAnswer,
        explanation: newQ.explanation,
        confidence: 0.95,
      }
    });

    return NextResponse.json({
      message: 'Question regenerated successfully.',
      question: updated
    });
  } catch (error: any) {
    console.error('Question regeneration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to regenerate question.' }, { status: 500 });
  }
}
