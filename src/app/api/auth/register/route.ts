import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if this is the first registered user
    const userCount = await db.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';
    const plan = userCount === 0 ? 'ENTERPRISE' : 'FREE';
    const credits = userCount === 0 ? 100000 : 1000;

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        plan,
        credits,
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      message: 'User created successfully.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits }
    });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed.' }, { status: 500 });
  }
}
