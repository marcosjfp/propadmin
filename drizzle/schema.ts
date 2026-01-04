import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Tabela de usuários - base para autenticação e gestão de papéis
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "agent", "admin"]).default("user").notNull(),
  isAgent: boolean("isAgent").default(false).notNull(),
  creci: varchar("creci", { length: 50 }), // Número CRECI para agentes imobiliários
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de propriedades imobiliárias
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["apartamento", "casa", "terreno", "comercial", "outro"]).notNull(),
  transactionType: mysqlEnum("transactionType", ["venda", "aluguel"]).notNull(),
  price: int("price").notNull(), // Preço em centavos para evitar problemas com decimais
  size: int("size").notNull(), // Tamanho em metros quadrados
  rooms: int("rooms").notNull(),
  bathrooms: int("bathrooms").notNull(),
  hasBackyard: boolean("hasBackyard").default(false).notNull(),
  hasLivingRoom: boolean("hasLivingRoom").default(true).notNull(),
  hasKitchen: boolean("hasKitchen").default(true).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }),
  agentId: int("agentId").notNull().references(() => users.id, { onDelete: "cascade" }), // Foreign key para users
  status: mysqlEnum("status", ["ativa", "vendida", "alugada", "inativa"]).default("ativa").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Tabela de comissões - registra cada transação e sua comissão
 */
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }), // Foreign key para properties
  agentId: int("agentId").notNull().references(() => users.id, { onDelete: "cascade" }), // Foreign key para users
  transactionType: mysqlEnum("transactionType", ["venda", "aluguel"]).notNull(),
  transactionAmount: int("transactionAmount").notNull(), // Valor da transação em centavos
  commissionRate: int("commissionRate").notNull(), // Taxa em percentual (ex: 800 = 8%)
  commissionAmount: int("commissionAmount").notNull(), // Valor da comissão em centavos
  status: mysqlEnum("status", ["pendente", "paga", "cancelada"]).default("pendente").notNull(),
  paymentDate: timestamp("paymentDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;

/**
 * Tabela de imagens das propriedades
 */
export const propertyImages = mysqlTable("property_images", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // URL ou caminho do arquivo
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 50 }).notNull(),
  size: int("size").notNull(), // Tamanho em bytes
  isPrimary: boolean("isPrimary").default(false).notNull(), // Imagem principal
  sortOrder: int("sortOrder").default(0).notNull(), // Ordem de exibição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

