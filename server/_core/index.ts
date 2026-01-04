import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from '../routers/index.js';
import { createContext } from '../context.js';
import { testConnection } from '../db.js';
import { COOKIE_NAME } from '../../shared/const.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// tRPC endpoint
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Development login endpoint - Creates a mock authenticated session
app.get('/api/dev-login', (req, res) => {
  // Check query param for role (default: agent)
  const role = req.query.role as string || 'agent';
  
  // Map role to user ID from database
  const userConfig = {
    agent: { id: 1, name: 'Agente Teste', email: 'agente@teste.com', role: 'agent' as const, creci: 'CRECI-12345' },
    admin: { id: 2, name: 'Administrador', email: 'admin@teste.com', role: 'admin' as const, creci: null },
    user: { id: 3, name: 'Usuário Comum', email: 'user@teste.com', role: 'user' as const, creci: null },
  };

  const mockUser = userConfig[role as keyof typeof userConfig] || userConfig.agent;

  // Set session cookie
  const sessionData = JSON.stringify({
    ...mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  res.cookie(COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  // Redirect back to home page
  res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
});

// Dev login page with role selection
app.get('/api/dev-login-page', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dev Login</title>
      <style>
        body { font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #333; margin-bottom: 30px; }
        .buttons { display: flex; flex-direction: column; gap: 15px; }
        a { display: block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; transition: transform 0.2s; }
        a:hover { transform: scale(1.05); }
        .agent { background: #3b82f6; color: white; }
        .admin { background: #8b5cf6; color: white; }
        .user { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏠 Dev Login</h1>
        <p style="color: #666; margin-bottom: 20px;">Selecione o tipo de usuário:</p>
        <div class="buttons">
          <a href="/api/dev-login?role=agent" class="agent">🏢 Entrar como Corretor</a>
          <a href="/api/dev-login?role=admin" class="admin">⚙️ Entrar como Administrador</a>
          <a href="/api/dev-login?role=user" class="user">👤 Entrar como Usuário</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Serve static files from the client dist folder in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.log('⚠️  Starting server without database connection');
    console.log('💡 To set up the database:');
    console.log('   1. Start Docker Desktop');
    console.log('   2. Run: docker run --name mysql-admin-propriedades -e MYSQL_ROOT_PASSWORD=rootpass123 -e MYSQL_DATABASE=administrador_de_propriedades -p 3307:3306 -d mysql:8.0');
    console.log('   3. Wait 30 seconds for MySQL to start');
    console.log('');
  }

  app.listen(port, () => {
    console.log('');
    console.log('========================================');
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
    console.log(`🏥 Health check: http://localhost:${port}/api/health`);
    if (dbConnected) {
      console.log(`💾 Database: Connected to MySQL`);
    }
    console.log('========================================');
    console.log('');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('💡 Client dev server should be running on http://localhost:5173');
      console.log('   If not started, run: pnpm --dir client dev');
      console.log('');
    }
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
