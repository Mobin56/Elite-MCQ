import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;

  try {
    const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, type, difficulty } = await req.json();

    const existingQuestion = await db.question.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingQuestion || existingQuestion.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const updated = await db.question.update({
      where: { id },
      data: {
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        explanation,
        type: type.toUpperCase(),
        difficulty: difficulty.toUpperCase(),
      },
    });

    return NextResponse.json({ message: 'Question updated successfully.', question: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update question.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existingQuestion = await db.question.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingQuestion || existingQuestion.project.userId !== user.userId) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    await db.question.delete({ where: { id } });

    // Decrement the total question count of the project
    await db.project.update({
      where: { id: existingQuestion.projectId },
      data: {
        totalQuestions: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete question.' }, { status: 500 });
  }
}
