import { inferAsyncReturnType } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { db } from './db.js';
import { COOKIE_NAME } from '../shared/const.js';

// Create context for tRPC
export async function createContext({ req, res }: trpcExpress.CreateExpressContextOptions) {
  let user = null;
  
  // Try to get user from cookie
  const sessionCookie = req.cookies?.[COOKIE_NAME];
  if (sessionCookie) {
    try {
      user = JSON.parse(sessionCookie);
    } catch (error) {
      console.error('Error parsing session cookie:', error);
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
