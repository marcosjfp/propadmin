import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { COOKIE_NAME } from '../../shared/const';

export const authRouter = router({
  // Get current authenticated user
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }
    return ctx.user;
  }),

  // Logout current user
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear the cookie
    ctx.res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),
});
