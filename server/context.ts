import { inferAsyncReturnType } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { COOKIE_NAME } from '../shared/const.js';
import { users } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

// Chave secreta para JWT - em produção, usar variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura-aqui-123!@#';

// Interface do payload do JWT
interface JWTPayload {
  id: number;
  email?: string;
  role: string;
  isAgent: boolean;
  iat?: number;
  exp?: number;
}

// Função para criar token JWT
export function createJWT(user: { id: number; email?: string | null; role: string; isAgent: boolean }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      isAgent: user.isAgent,
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
      // Primeiro tenta como JWT
      const decoded = verifyJWT(sessionCookie);
      if (decoded) {
        // Validar que o usuário ainda existe no banco
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
            isAgent: dbUser.isAgent,
            creci: dbUser.creci,
          };
        }
      } else {
        // Fallback: tenta como JSON para compatibilidade com sessões antigas
        // REMOVER ESTE BLOCO APÓS MIGRAÇÃO
        try {
          const parsed = JSON.parse(sessionCookie);
          if (parsed?.id) {
            const [dbUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, parsed.id))
              .limit(1);
            
            if (dbUser) {
              user = {
                id: dbUser.id,
                openId: dbUser.openId,
                name: dbUser.name,
                email: dbUser.email,
                phone: dbUser.phone,
                role: dbUser.role,
                isAgent: dbUser.isAgent,
                creci: dbUser.creci,
              };
              
              // Atualizar para JWT automaticamente
              const newToken = createJWT(dbUser);
              res.cookie(COOKIE_NAME, newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
              });
            }
          }
        } catch {
          // Cookie inválido, ignorar
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
