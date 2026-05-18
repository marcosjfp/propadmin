import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;

// CSRF Protection Middleware
const checkCSRF = t.middleware(({ ctx, type, next }) => {
  if (type === 'mutation' && process.env.NODE_ENV === 'production') {
    const origin = ctx.req?.headers?.origin;
    const clientUrl = process.env.CLIENT_URL;
    
    if (clientUrl && origin !== clientUrl) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid origin (CSRF protection)' });
    }
  }
  return next({ ctx });
});

export const publicProcedure = t.procedure.use(checkCSRF);

// Middleware to check if user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware to check if user is an agent
const isAgent = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado' });
  }
  if (ctx.user.role !== 'agent' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas agentes podem realizar esta ação' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware to check if user is an admin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado' });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem realizar esta ação' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const agentProcedure = t.procedure.use(isAgent);
export const adminProcedure = t.procedure.use(isAdmin);
