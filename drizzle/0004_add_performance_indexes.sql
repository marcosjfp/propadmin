-- Migration: Adicionar índices para performance
-- Criado em: 2024-01-15
-- Status: APLICADO

-- Índices para a tabela de comissões (otimizar consultas por agente e propriedade)
CREATE INDEX idx_commissions_agent_id ON commissions(agentId);
CREATE INDEX idx_commissions_property_id ON commissions(propertyId);
CREATE INDEX idx_commissions_status ON commissions(status);

-- Índices para a tabela de propriedades (otimizar consultas por status e agente)
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_is_approved ON properties(is_approved);

-- Índices para a tabela de usuários (otimizar consultas por email e role)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_agent ON users(isAgent);

-- Índices para a tabela de imagens (otimizar consultas por propriedade)
CREATE INDEX idx_property_images_property_id ON property_images(propertyId);

-- Índices para a tabela de logs de auditoria (já existentes)
-- idx_audit_user ON audit_logs(user_id)
-- idx_audit_entity ON audit_logs(entity_type, entity_id)
-- idx_audit_action ON audit_logs(action)
-- idx_audit_created ON audit_logs(created_at)
