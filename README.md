# PropAdmin 🏢

PropAdmin is a comprehensive, production-ready Property Administration System built for modern real estate management. It provides end-to-end functionality for managing properties, assigning agents, tracking commissions, and logging system audits.

## 🚀 Tech Stack

- **Frontend:** React, Vite, TailwindCSS, React Router
- **Backend API:** Node.js, Express, tRPC (Type-safe RPC)
- **Database:** MySQL
- **ORM:** Drizzle ORM
- **Authentication:** Custom JWT-based Auth + `bcryptjs`
- **Monorepo Management:** pnpm workspaces

## 📁 Project Structure

The project is structured as a monorepo using `pnpm workspaces` to cleanly separate the client, server, and shared interfaces.

```text
propadmin/
├── client/                 # React Frontend Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level components (Home, Dashboard, etc.)
│   │   ├── lib/            # Utilities and tRPC client configuration
│   │   └── App.tsx         # Main application routing
│   └── vite.config.ts      # Vite configuration
│
├── server/                 # Node.js + Express + tRPC Backend
│   ├── _core/              # Express server initialization & middleware
│   ├── routers/            # tRPC Routers (API Endpoints)
│   │   ├── auth.ts         # Authentication & Bruteforce protection
│   │   ├── users.ts        # User & Agent management
│   │   ├── properties.ts   # Property listings & approval workflows
│   │   ├── audit.ts        # System audit logging
│   │   ├── commissions.ts  # Agent commission tracking
│   │   └── images.ts       # Property image management
│   ├── context.ts          # tRPC Context (Auth tokens, DB inject, IP/UA)
│   └── trpc.ts             # tRPC base initialization & middlewares (CSRF, RBAC)
│
├── drizzle/                # Database schema and migrations
│   └── schema.ts           # Centralized Drizzle schema definitions
│
├── shared/                 # Shared logic between Client and Server
│   └── const.ts            # Constants (e.g., cookie names)
│
├── scripts/                # Administrative & Migration scripts
└── package.json            # Root workspace configuration
```

## 🔐 Security Features

PropAdmin has undergone rigorous security hardening to ensure production-readiness:

- **CSRF Protection:** Strict validation of `Origin` headers against the allowed `CLIENT_URL` via custom tRPC middleware.
- **DDoS Mitigation:** Enforced `1mb` JSON payload limits and in-memory Brute Force Protection (locks accounts after 5 failed attempts).
- **Hardened Express Server:** Integration of `helmet` for robust Content Security Policies (CSP) and HTTP headers.
- **SQL Injection Prevention:** Utilization of parameterized queries via `drizzle-orm`.
- **Timing Attack Mitigation:** Dummy `bcrypt.compare` operations to prevent user enumeration during the login flow.
- **Role-Based Access Control (RBAC):** Middleware-enforced roles (`admin`, `agent`, `user`) securing both queries and mutations.

## 👥 Role-Based Workflows

The application features three distinct user roles:

1. **Users:** Can view approved, active properties and register for accounts.
2. **Agents:** Can create property listings (which require admin approval), upload images, and track their own commissions.
3. **Admins:** Have full system oversight. Admins can approve/reject pending properties, create new agent accounts, override default commission rates, and review comprehensive audit logs.

## 🛠️ Getting Started

### 1. Environment Setup

Copy the example environment file and configure your database connection and secrets.

```bash
cp .env.example .env
```

Ensure you set:
- `DATABASE_URL`: Your MySQL connection string.
- `JWT_SECRET`: A secure, random string for signing tokens.
- `CLIENT_URL`: The URL of the frontend (e.g., `http://localhost:5173` for dev).
- `NODE_ENV`: Set to `development` for local testing.

### 2. Installation

Install all dependencies across the monorepo using `pnpm`:

```bash
pnpm install
```

### 3. Database Migration & Seeding

Push the Drizzle schema to your MySQL database and optionally seed the initial admin user:

```bash
pnpm db:push
node migrate-auth.mjs
```

### 4. Running the Application

You can start the backend server and frontend application independently:

**Backend Server (Runs on port 3000):**
```bash
pnpm run dev
```

**Frontend Client (Runs on port 5173):**
```bash
pnpm run client-dev
```

## 📖 Additional Documentation

For more detailed guides on deployment and infrastructure, see the markdown files in the root directory:
- `DEPLOY_GUIDE.md`
- `DATABASE_SETUP.md`
- `TUTORIAL_RAILWAY.md`
