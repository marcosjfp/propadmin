import { relations } from "drizzle-orm";
import { users, properties, commissions } from "./schema";

/**
 * Relações entre as tabelas para facilitar consultas com joins
 */

// Relações do usuário
export const usersRelations = relations(users, ({ many }) => ({
  // Um usuário (agente) pode ter muitas propriedades
  properties: many(properties),
  // Um usuário (agente) pode ter muitas comissões
  commissions: many(commissions),
}));

// Relações das propriedades
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  // Uma propriedade pertence a um agente (usuário)
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  // Uma propriedade pode gerar muitas comissões (caso seja alugada várias vezes)
  commissions: many(commissions),
}));

// Relações das comissões
export const commissionsRelations = relations(commissions, ({ one }) => ({
  // Uma comissão pertence a uma propriedade
  property: one(properties, {
    fields: [commissions.propertyId],
    references: [properties.id],
  }),
  // Uma comissão pertence a um agente (usuário)
  agent: one(users, {
    fields: [commissions.agentId],
    references: [users.id],
  }),
}));
