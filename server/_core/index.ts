import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from '../routers/index.js';
import { createContext, createJWT } from '../context.js';
import { testConnection, db } from '../db.js';
import { users } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { COOKIE_NAME } from '../../shared/const.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting server initialization...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 PORT: ${process.env.PORT || 3000}`);

// Detect static files path
const possibleStaticPaths = [
  path.join(process.cwd(), 'client', 'dist'),
  '/app/client/dist',
  path.join(__dirname, '..', '..', 'client', 'dist'),
];

let staticFilesPath: string | null = null;
for (const p of possibleStaticPaths) {
  if (fs.existsSync(path.join(p, 'index.html')) && !staticFilesPath) {
    staticFilesPath = p;
  }
}

if (staticFilesPath) {
  console.log(`📂 Serving static files from: ${staticFilesPath}`);
} else {
  console.log('⚠️  No static files found — running API-only mode.');
}

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0'; // Necessário para Railway e outros cloud providers

// Trust proxy - needed for Railway and other cloud providers to detect HTTPS
app.set('trust proxy', 1);

// Health check endpoint PRIMEIRO - antes de qualquer middleware
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health', // skip health checks
});

const trpcLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(cors({
  origin: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173'),
  credentials: true,
}));
app.use(generalLimiter);
app.use(express.json());
app.use(cookieParser());

// tRPC endpoint
app.use(
  '/trpc',
  trpcLimiter,
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Development login endpoint - Creates a mock authenticated session (dev only)
app.get('/api/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    // Check query param for role (default: agent)
    const role = req.query.role as string || 'agent';
    
    // Buscar usuário do banco de dados pelo role
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .limit(1);
    
    if (!dbUser) {
      console.error(`❌ No user found with role: ${role}`);
      return res.status(404).send(`Usuário com role '${role}' não encontrado no banco de dados`);
    }

    // Criar token JWT seguro
    const jwtToken = createJWT({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      isAgent: dbUser.isAgent,
    });
    
    console.log(`🔐 Setting JWT session cookie for user: ${dbUser.name} (${dbUser.role}) [ID: ${dbUser.id}]`);
    
    // Cookie settings for production
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // 'lax' works for same-site redirects
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // In production, redirect to root path (relative redirect)
    // This ensures the cookie domain matches
    console.log(`🔄 Redirecting to /`);
    res.redirect('/');
  } catch (error) {
    console.error('❌ Error in dev-login:', error);
    res.status(500).send('Erro ao fazer login');
  }
});

// Dev login page with role selection (dev only)
app.get('/api/dev-login-page', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  // Se passou role na query, redireciona direto para o login
  const role = req.query.role as string;
  if (role && ['admin', 'agent', 'user'].includes(role)) {
    return res.redirect(`/api/dev-login?role=${role}`);
  }

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
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          max-width: 500px;
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
          margin-bottom: 30px;
        }
        .role-section {
          margin-bottom: 20px;
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
          padding: 16px 20px;
          margin-bottom: 12px;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
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
        .admin {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: white;
        }
        .admin:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
        }
        .corretor {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }
        .corretor:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }
        .usuario {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .usuario:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        .divider {
          display: flex;
          align-items: center;
          margin: 25px 0;
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
        @media (max-width: 480px) {
          .login-container {
            padding: 25px;
          }
          h1 {
            font-size: 24px;
          }
          .login-btn {
            padding: 14px 16px;
          }
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
          
          <a href="/api/dev-login?role=admin" class="login-btn admin">
            <span class="icon">🛡️</span>
            <span class="text">
              <strong>Administrador</strong>
              <div class="description">Acesso completo ao sistema e relatórios</div>
            </span>
            <span class="arrow">→</span>
          </a>
          
          <a href="/api/dev-login?role=agent" class="login-btn corretor">
            <span class="icon">💼</span>
            <span class="text">
              <strong>Corretor de Imóveis</strong>
              <div class="description">Gerencie imóveis e acompanhe suas comissões</div>
            </span>
            <span class="arrow">→</span>
          </a>
          
          <a href="/api/dev-login?role=user" class="login-btn usuario">
            <span class="icon">👤</span>
            <span class="text">
              <strong>Usuário</strong>
              <div class="description">Visualize imóveis e entre em contato</div>
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

// Serve static files - use the path detected at startup
if (staticFilesPath) {
  console.log(`🌐 Configuring static file serving from: ${staticFilesPath}`);
  app.use(express.static(staticFilesPath));
  
  // Catch-all route for SPA - must be after all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticFilesPath!, 'index.html'));
  });
} else {
  // Fallback: serve a simple HTML page
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Administrador de Propriedades</title></head>
      <body style="font-family: sans-serif; padding: 50px; text-align: center;">
        <h1>🏠 Administrador de Propriedades</h1>
        <p>O servidor está funcionando, mas os arquivos do frontend não foram encontrados.</p>
        <p><a href="/api/health">Health Check</a> | <a href="/api/dev-login-page">Login</a></p>
      </body>
      </html>
    `);
  });
}

// Start server
async function startServer() {
  console.log('🔄 Starting HTTP server...');
  
  // Iniciar o servidor PRIMEIRO para passar no health check
  const server = app.listen(Number(port), host, () => {
    console.log('');
    console.log('========================================');
    console.log(`✅ Server running on http://${host}:${port}`);
    console.log(`📡 tRPC endpoint: /trpc`);
    console.log(`🏥 Health check: /api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('========================================');
    console.log('');
  });

  // Testar conexão com banco DEPOIS do servidor iniciar
  console.log('🔄 Testing database connection...');
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    console.log('💾 Database: Connected to MySQL');
  } else {
    console.log('⚠️  Database: NOT connected - some features may not work');
    console.log('💡 Verifique as variáveis de ambiente do banco de dados');
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
