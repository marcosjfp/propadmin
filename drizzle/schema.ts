import { boolean, bigint, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const userStatus = pgEnum("user_status", ["active", "pending", "rejected"]);
const userRole = pgEnum("user_role", ["user", "agent", "admin"]);
const propertyType = pgEnum("property_type", ["apartamento", "casa", "terreno", "comercial", "outro"]);
const transactionType = pgEnum("transaction_type", ["venda", "aluguel"]);
const propertyStatus = pgEnum("property_status", ["pendente", "ativa", "vendida", "alugada", "inativa", "rejeitada"]);
const commissionStatus = pgEnum("commission_status", ["pendente", "paga", "cancelada"]);
const auditAction = pgEnum("audit_action", [
  "user_created", "user_updated", "user_deleted", "user_role_changed", "user_login", "user_logout",
  "property_created", "property_updated", "property_deleted", "property_status_changed", "property_sold",
  "property_rented", "property_assigned", "property_commission_changed", "property_approved", "property_rejected",
  "image_uploaded", "image_deleted", "image_primary_changed", "commission_created", "commission_status_changed",
  "commission_paid", "commission_cancelled",
]);
const entityType = pgEnum("entity_type", ["user", "property", "commission", "image"]);

/**
 * Tabela de usuários - base para autenticação e gestão de papéis
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: text("passwordHash"),
  status: userStatus("status").default("active").notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  creci: varchar("creci", { length: 50 }), // Número CRECI para agentes imobiliários
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de propriedades imobiliárias
 */
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: propertyType("type").notNull(),
  transactionType: transactionType("transactionType").notNull(),
  price: bigint("price", { mode: "number" }).notNull(), // Preço em centavos para evitar problemas com decimais
  size: integer("size").notNull(), // Tamanho em metros quadrados
  rooms: integer("rooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  hasBackyard: boolean("hasBackyard").default(false).notNull(),
  hasLivingRoom: boolean("hasLivingRoom").default(true).notNull(),
  hasKitchen: boolean("hasKitchen").default(true).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }),
  agentId: integer("agentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAgentId: integer("assignedAgentId").references(() => users.id, { onDelete: "set null" }),
  customCommissionRate: integer("customCommissionRate"),
  status: propertyStatus("status").default("pendente").notNull(),
  isApproved: boolean("isApproved").default(false).notNull(), // Se o imóvel foi aprovado pelo admin
  approvedBy: integer("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approvedAt"), // Data de aprovação
  rejectionReason: text("rejectionReason"), // Motivo da rejeição, se aplicável
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Tabela de comissões - registra cada transação e sua comissão
 */
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  agentId: integer("agentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  transactionType: transactionType("transactionType").notNull(),
  transactionAmount: bigint("transactionAmount", { mode: "number" }).notNull(), // Valor da transação em centavos
  commissionRate: integer("commissionRate").notNull(),
  commissionAmount: bigint("commissionAmount", { mode: "number" }).notNull(), // Valor da comissão em centavos
  status: commissionStatus("status").default("pendente").notNull(),
  paymentDate: timestamp("paymentDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;

/**
 * Tabela de imagens das propriedades
 */
export const propertyImages = pgTable("property_images", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // URL ou caminho do arquivo
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 50 }).notNull(),
  size: integer("size").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // Imagem principal
  sortOrder: integer("sortOrder").default(0).notNull(), // Ordem de exibição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

/**
 * Tabela de histórico/auditoria - rastreia todas as ações importantes do sistema
 */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  
  // Quem fez a ação
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("userName", { length: 255 }), // Armazenado para caso o usuário seja deletado
  userRole: varchar("userRole", { length: 50 }),
  
  // O que foi feito
  action: auditAction("action").notNull(),
  
  // Em qual entidade
  entityType: entityType("entityType").notNull(),
  entityId: integer("entityId"),
  entityName: varchar("entityName", { length: 255 }), // Nome/título para referência
  
  // Detalhes da mudança
  previousValue: text("previousValue"), // JSON com valores anteriores
  newValue: text("newValue"), // JSON com novos valores
  description: text("description"), // Descrição legível da ação
  
  // Metadados
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

