import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const type = searchParams.get('type');
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId parameter is required.' }, { status: 400 });
  }

  try {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== user.userId) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const where: any = { projectId };
    if (type && type !== 'ALL') {
      where.type = type.toUpperCase();
    }
    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty.toUpperCase();
    }
    if (search) {
      where.OR = [
        { question: { contains: search } },
        { optionA: { contains: search } },
        { optionB: { contains: search } },
        { optionC: { contains: search } },
        { optionD: { contains: search } },
        { explanation: { contains: search } },
      ];
    }

    const questions = await db.question.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch questions.' }, { status: 500 });
  }
}
