import { inferAsyncReturnType } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { COOKIE_NAME } from '../shared/const.js';
import { users } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

// Chave secreta para JWT - obrigatória via variável de ambiente
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Interface do payload do JWT
interface JWTPayload {
  id: number;
  email?: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Função para criar token JWT
export function createJWT(user: { id: number; email?: string | null; role: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expira em 7 dias
  );
}

// Função para verificar token JWT
export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Create context for tRPC
export async function createContext({ req, res }: trpcExpress.CreateExpressContextOptions) {
  let user = null;
  
  // Try to get user from cookie (JWT)
  const sessionCookie = req.cookies?.[COOKIE_NAME];
  
  if (sessionCookie) {
    try {
      const decoded = verifyJWT(sessionCookie);
      if (decoded) {
        // Validate that the user still exists in the database
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);
        
        if (dbUser) {
          user = {
            id: dbUser.id,
            openId: dbUser.openId,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: dbUser.role,
            creci: dbUser.creci,
          };
        }
      }
    } catch (error) {
      console.error('Error parsing session:', error);
    }
  }

  return {
    db,
    user,
    req,
    res,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
