DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'pending', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'agent', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE property_type AS ENUM ('apartamento', 'casa', 'terreno', 'comercial', 'outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('venda', 'aluguel'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE property_status AS ENUM ('pendente', 'ativa', 'vendida', 'alugada', 'inativa', 'rejeitada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE commission_status AS ENUM ('pendente', 'paga', 'cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_action AS ENUM ('user_created', 'user_updated', 'user_deleted', 'user_role_changed', 'user_login', 'user_logout', 'property_created', 'property_updated', 'property_deleted', 'property_status_changed', 'property_sold', 'property_rented', 'property_assigned', 'property_commission_changed', 'property_approved', 'property_rejected', 'image_uploaded', 'image_deleted', 'image_primary_changed', 'commission_created', 'commission_status_changed', 'commission_paid', 'commission_cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE entity_type AS ENUM ('user', 'property', 'commission', 'image'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  "username" varchar(64) UNIQUE,
  "passwordHash" text,
  "status" user_status NOT NULL DEFAULT 'active',
  "name" text,
  "email" varchar(320),
  "phone" varchar(20),
  "loginMethod" varchar(64),
  "role" user_role NOT NULL DEFAULT 'user',
  "creci" varchar(50),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "properties" (
  "id" serial PRIMARY KEY,
  "title" varchar(255) NOT NULL,
  "description" text,
  "type" property_type NOT NULL,
  "transactionType" transaction_type NOT NULL,
  "price" bigint NOT NULL,
  "size" integer NOT NULL,
  "rooms" integer NOT NULL,
  "bathrooms" integer NOT NULL,
  "hasBackyard" boolean NOT NULL DEFAULT false,
  "hasLivingRoom" boolean NOT NULL DEFAULT true,
  "hasKitchen" boolean NOT NULL DEFAULT true,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "state" varchar(2) NOT NULL,
  "zipCode" varchar(10),
  "agentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assignedAgentId" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "customCommissionRate" integer,
  "status" property_status NOT NULL DEFAULT 'pendente',
  "isApproved" boolean NOT NULL DEFAULT false,
  "approvedBy" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "approvedAt" timestamp,
  "rejectionReason" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "commissions" (
  "id" serial PRIMARY KEY,
  "propertyId" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "agentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "transactionType" transaction_type NOT NULL,
  "transactionAmount" bigint NOT NULL,
  "commissionRate" integer NOT NULL,
  "commissionAmount" bigint NOT NULL,
  "status" commission_status NOT NULL DEFAULT 'pendente',
  "paymentDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "property_images" (
  "id" serial PRIMARY KEY,
  "propertyId" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "filename" varchar(255) NOT NULL,
  "originalName" varchar(255) NOT NULL,
  "mimeType" varchar(50) NOT NULL,
  "size" integer NOT NULL,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "userName" varchar(255),
  "userRole" varchar(50),
  "action" audit_action NOT NULL,
  "entityType" entity_type NOT NULL,
  "entityId" integer,
  "entityName" varchar(255),
  "previousValue" text,
  "newValue" text,
  "description" text,
  "ipAddress" varchar(45),
  "userAgent" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);