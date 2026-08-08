import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import {
  generateContentMap,
  adjustDistributionRatios,
  generateMCQBatch,
  validateMCQBatch,
  isDuplicateQuestion
} from '@/lib/engine/mcqGenerator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const { documentId, language, totalQuestions, distribution, difficultyDist } = await req.json();

    if (!documentId || !language || !totalQuestions || !distribution || !difficultyDist) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // Check credits
    const dbUser = await db.user.findUnique({ where: { id: user.userId } });
    if (!dbUser || dbUser.credits < totalQuestions) {
      return NextResponse.json({
        error: `Insufficient credits. You need ${totalQuestions} credits, but you have ${dbUser?.credits || 0} credits.`
      }, { status: 400 });
    }

    const doc = await db.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    // Create the Project in PROCESSING state
    const project = await db.project.create({
      data: {
        userId: user.userId,
        documentId: doc.id,
        chapterName: 'Analyzing Chapter...',
        subject: 'Pending',
        language: language.toUpperCase(),
        totalQuestions,
        status: 'PROCESSING',
        distribution: JSON.stringify(distribution),
        difficultyDist: JSON.stringify(difficultyDist),
      },
    });

    // Start background processing
    runBackgroundMCQGeneration(project.id, doc.extractedText, totalQuestions, distribution, difficultyDist, language.toUpperCase(), user.userId);

    // Return the project details immediately
    return NextResponse.json({
      message: 'MCQ Generation started.',
      projectId: project.id,
      status: 'PROCESSING',
    });
  } catch (error: any) {
    console.error('Generation request error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start generation.' }, { status: 500 });
  }
}

// Background generator function (non-awaited)
async function runBackgroundMCQGeneration(
  projectId: string,
  chapterText: string,
  totalQty: number,
  reqDist: Record<string, number>,
  difficultyDist: Record<string, number>,
  language: string,
  userId: string
) {
  try {
    // 1. Build Content Map
    const contentMap = await generateContentMap(chapterText);
    
    // Update chapter name and subject
    await db.project.update({
      where: { id: projectId },
      data: {
        chapterName: contentMap.chapterName,
        subject: contentMap.subject,
      },
    });

    // 2. Adjust Ratios based on content
    const { adjusted, warningLog } = adjustDistributionRatios(reqDist, contentMap);

    await db.project.update({
      where: { id: projectId },
      data: {
        distribution: JSON.stringify(adjusted),
        warningLog,
      },
    });

    // 3. Batch Calculation
    // We will generate in batches of 25 to ensure the LLM outputs stable sized arrays and fits token limits.
    const batchSize = 25;
    const totalBatches = Math.ceil(totalQty / batchSize);
    
    // Create batch logs in database
    for (let b = 1; b <= totalBatches; b++) {
      const currentBatchQty = b === totalBatches ? totalQty - (b - 1) * batchSize : batchSize;
      await db.generationBatch.create({
        data: {
          projectId,
          batchNumber: b,
          quantity: currentBatchQty,
          status: 'PENDING',
        },
      });
    }

    // Process each batch
    let totalGenerated = 0;

    for (let b = 1; b <= totalBatches; b++) {
      const batchRecord = await db.generationBatch.findFirst({
        where: { projectId, batchNumber: b },
      });

      if (!batchRecord) continue;

      await db.generationBatch.update({
        where: { id: batchRecord.id },
        data: { status: 'PROCESSING' },
      });

      let success = false;
      let retries = 0;
      let batchQuestions: any[] = [];

      const currentBatchQty = batchRecord.quantity;

      // Calculate question type distributions for this batch specifically
      const batchTypesToGenerate: Record<string, number> = {};
      let distributedCount = 0;

      Object.entries(adjusted).forEach(([type, pct]) => {
        const typeQty = Math.round((pct / 100) * currentBatchQty);
        if (typeQty > 0) {
          batchTypesToGenerate[type] = typeQty;
          distributedCount += typeQty;
        }
      });

      // Handle any rounding difference
      if (distributedCount !== currentBatchQty) {
        const diff = currentBatchQty - distributedCount;
        const firstType = Object.keys(batchTypesToGenerate)[0] || 'conceptual';
        batchTypesToGenerate[firstType] = (batchTypesToGenerate[firstType] || 0) + diff;
      }

      while (!success && retries < 3) {
        try {
          // Fetch existing questions to check for duplicates
          const existingQs = await db.question.findMany({
            where: { projectId },
            select: { question: true },
          });

          // Generate
          const rawGenerated = await generateMCQBatch(
            chapterText,
            contentMap,
            currentBatchQty,
            batchTypesToGenerate,
            difficultyDist,
            language,
            existingQs
          );

          // Validate
          const validated = await validateMCQBatch(rawGenerated, chapterText, language);

          if (validated.length > 0) {
            batchQuestions = validated;
            success = true;
          } else {
            retries++;
          }
        } catch (err) {
          console.error(`Error in Batch ${b}, retry ${retries}:`, err);
          retries++;
        }
      }

      if (success && batchQuestions.length > 0) {
        // Save questions
        for (const q of batchQuestions) {
          await db.question.create({
            data: {
              projectId,
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              type: q.type.toUpperCase(),
              difficulty: q.difficulty.toUpperCase(),
              sourcePage: q.sourcePage || 'Page 1',
              sourceText: q.sourceText || '',
              confidence: q.confidence || 0.9,
            },
          });
        }

        totalGenerated += batchQuestions.length;

        await db.generationBatch.update({
          where: { id: batchRecord.id },
          data: { status: 'COMPLETED' },
        });
      } else {
        await db.generationBatch.update({
          where: { id: batchRecord.id },
          data: { status: 'FAILED' },
        });
      }
    }

    // Final Project Update
    const finalCount = await db.question.count({ where: { projectId } });

    if (finalCount > 0) {
      await db.project.update({
        where: { id: projectId },
        data: {
          status: 'COMPLETED',
          totalQuestions: finalCount,
        },
      });

      // Deduct credits from user
      await db.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: finalCount,
          },
        },
      });
    } else {
      await db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
    }
  } catch (error) {
    console.error('Background generation crashed:', error);
    await db.project.update({
      where: { id: projectId },
      data: { status: 'FAILED' },
    });
  }
}
