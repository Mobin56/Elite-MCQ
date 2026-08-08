import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'elite_academy_super_secret_key_123456';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
