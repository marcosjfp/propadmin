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
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Administrador de Propriedades</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .login-container {
          background: white;
          padding: 50px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          max-width: 450px;
          width: 100%;
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        h1 {
          color: #1f2937;
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .subtitle {
          color: #6b7280;
          font-size: 16px;
          margin-bottom: 40px;
        }
        .role-section {
          margin-bottom: 30px;
        }
        .role-label {
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .login-btn {
          display: flex;
          align-items: center;
          gap: 15px;
          width: 100%;
          padding: 18px 25px;
          margin-bottom: 15px;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
        .login-btn .icon {
          font-size: 24px;
        }
        .login-btn .text {
          flex: 1;
          text-align: left;
        }
        .login-btn .description {
          font-size: 12px;
          font-weight: 400;
          opacity: 0.9;
          margin-top: 4px;
        }
        .login-btn .arrow {
          font-size: 18px;
          opacity: 0.7;
        }
        .corretor {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }
        .corretor:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }
        .admin {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: white;
        }
        .admin:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
        }
        .divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #9ca3af;
          font-size: 12px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .divider span {
          padding: 0 15px;
        }
        .footer {
          color: #9ca3af;
          font-size: 13px;
        }
        .footer a {
          color: #6366f1;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo">🏠</div>
        <h1>Bem-vindo!</h1>
        <p class="subtitle">Administrador de Propriedades</p>
        
        <div class="role-section">
          <p class="role-label">Selecione seu perfil para entrar</p>
          
          <a href="/api/dev-login?role=agent" class="login-btn corretor">
            <span class="icon">🏢</span>
            <span class="text">
              <strong>Corretor de Imóveis</strong>
              <div class="description">Gerencie imóveis e acompanhe suas comissões</div>
            </span>
            <span class="arrow">→</span>
          </a>
          
          <a href="/api/dev-login?role=admin" class="login-btn admin">
            <span class="icon">⚙️</span>
            <span class="text">
              <strong>Administrador</strong>
              <div class="description">Acesso completo ao sistema e relatórios</div>
            </span>
            <span class="arrow">→</span>
          </a>
        </div>
        
        <div class="divider"><span>Ambiente de Desenvolvimento</span></div>
        
        <p class="footer">
          Sistema de gerenciamento imobiliário
        </p>
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
