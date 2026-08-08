import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getUserFromRequest(req);
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { id } = params;

  try {
    const { role, plan, credits } = await req.json();

    const updated = await db.user.update({
      where: { id },
      data: {
        role,
        plan,
        credits: parseInt(credits),
      },
      select: { id: true, name: true, email: true, role: true, plan: true, credits: true }
    });

    return NextResponse.json({ message: 'User updated successfully.', user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getUserFromRequest(req);
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { id } = params;

  try {
    if (id === admin.userId) {
      return NextResponse.json({ error: 'You cannot delete yourself.' }, { status: 400 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user.' }, { status: 500 });
  }
}
