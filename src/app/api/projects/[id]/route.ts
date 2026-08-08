import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;

  try {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        document: {
          select: { fileName: true, fileType: true }
        },
        batches: {
          select: { batchNumber: true, status: true, quantity: true }
        }
      }
    });

    if (!project || project.userId !== user.userId) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const generatedQuestionsCount = await db.question.count({
      where: { projectId: id }
    });

    return NextResponse.json({
      project,
      generatedCount: generatedQuestionsCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch project.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;

  try {
    const project = await db.project.findUnique({ where: { id } });
    if (!project || project.userId !== user.userId) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ message: 'Project deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete project.' }, { status: 500 });
  }
}
