import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateDocxBuffer } from '@/lib/exports/docx';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const option = searchParams.get('option') || 'all'; // questionsOnly, questionsAnswers, all

  if (!projectId) {
    return new NextResponse('Missing projectId', { status: 400 });
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { document: true }
    });

    if (!project || project.userId !== user.userId) {
      return new NextResponse('Project not found', { status: 404 });
    }

    const questions = await db.question.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });

    if (questions.length === 0) {
      return new NextResponse('No questions generated for this project yet', { status: 400 });
    }

    const includeAnswers = option === 'questionsAnswers' || option === 'all';
    const includeExplanations = option === 'all';

    const buffer = await generateDocxBuffer(questions, {
      chapterName: project.chapterName,
      subject: project.subject,
      language: project.language,
      totalQuestions: questions.length,
      includeAnswers,
      includeExplanations,
    });

    const safeName = project.chapterName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_MCQ_Bank.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('DOCX download error:', error);
    return new NextResponse(error.message || 'Export failed', { status: 500 });
  }
}
