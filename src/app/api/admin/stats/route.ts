import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  try {
    const totalUsers = await db.user.count();
    const activeUsers = await db.user.count({
      where: {
        OR: [
          { documents: { some: {} } },
          { projects: { some: {} } }
        ]
      }
    });

    const totalMCQs = await db.question.count();
    const totalFiles = await db.document.count();
    
    const failedProjects = await db.project.count({
      where: { status: 'FAILED' }
    });

    const completedProjects = await db.project.count({
      where: { status: 'COMPLETED' }
    });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const dailyMCQs = await db.question.count({
      where: { createdAt: { gte: oneDayAgo } }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyMCQs = await db.question.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    const estimatedAiCost = (totalMCQs * 0.00015) + (totalFiles * 0.005);
    
    const documents = await db.document.findMany({ select: { extractedText: true } });
    const textBytes = documents.reduce((sum, d) => sum + (d.extractedText?.length || 0), 0);
    const totalStorageMB = ((textBytes + (totalMCQs * 500)) / (1024 * 1024)) + 0.5;

    const usersList = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, plan: true, credits: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalMCQs,
        totalFiles,
        dailyMCQs,
        monthlyMCQs,
        failedGenerations: failedProjects,
        completedGenerations: completedProjects,
        apiCost: parseFloat(estimatedAiCost.toFixed(4)),
        storageUsage: `${totalStorageMB.toFixed(2)} MB`,
      },
      users: usersList
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch admin stats.' }, { status: 500 });
  }
}
