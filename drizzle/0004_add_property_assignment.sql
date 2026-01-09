-- Migration: Adicionar atribuição de imóvel a corretor e comissão customizada
-- Data: 2026-01-09

-- Adicionar coluna para corretor atribuído
ALTER TABLE `properties` ADD COLUMN `assignedAgentId` INT NULL;

-- Adicionar coluna para taxa de comissão customizada
ALTER TABLE `properties` ADD COLUMN `customCommissionRate` INT NULL;

-- Adicionar índice para melhor performance nas consultas por corretor atribuído
CREATE INDEX `idx_properties_assigned_agent` ON `properties` (`assignedAgentId`);

-- Adicionar foreign key para assignedAgentId
ALTER TABLE `properties` ADD CONSTRAINT `fk_properties_assigned_agent` 
  FOREIGN KEY (`assignedAgentId`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Atualizar enum de ações do audit_logs para incluir novas ações
-- Nota: MySQL não permite modificar ENUMs facilmente, então precisamos recriar
-- Se necessário, execute manualmente:
-- ALTER TABLE `audit_logs` MODIFY COLUMN `action` ENUM(
--   'user_created', 'user_updated', 'user_deleted', 'user_role_changed', 'user_login', 'user_logout',
--   'property_created', 'property_updated', 'property_deleted', 'property_status_changed', 'property_sold', 'property_rented', 'property_assigned', 'property_commission_changed',
--   'image_uploaded', 'image_deleted', 'image_primary_changed',
--   'commission_created', 'commission_status_changed', 'commission_paid', 'commission_cancelled'
-- ) NOT NULL;
