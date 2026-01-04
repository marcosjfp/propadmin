import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { usersRouter } from './users.js';
import { propertiesRouter } from './properties.js';
import { commissionsRouter } from './commissions.js';
import { imagesRouter } from './images.js';
import { auditRouter } from './audit.js';

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  properties: propertiesRouter,
  commissions: commissionsRouter,
  images: imagesRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
