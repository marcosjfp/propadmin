-- ============================================
-- MIGRAÇÃO: Adicionar colunas de aprovação e atribuição
-- Execute este SQL no Railway MySQL
-- ============================================

-- Adicionar coluna assignedAgentId (corretor atribuído)
ALTER TABLE `properties` 
ADD COLUMN `assignedAgentId` int DEFAULT NULL AFTER `agentId`;

-- Adicionar coluna customCommissionRate (comissão customizada)
ALTER TABLE `properties` 
ADD COLUMN `customCommissionRate` int DEFAULT NULL AFTER `assignedAgentId`;

-- Adicionar coluna isApproved (se foi aprovado)
ALTER TABLE `properties` 
ADD COLUMN `isApproved` boolean DEFAULT true NOT NULL AFTER `status`;

-- Adicionar coluna approvedBy (quem aprovou)
ALTER TABLE `properties` 
ADD COLUMN `approvedBy` int DEFAULT NULL AFTER `isApproved`;

-- Adicionar coluna approvedAt (quando foi aprovado)
ALTER TABLE `properties` 
ADD COLUMN `approvedAt` timestamp NULL AFTER `approvedBy`;

-- Adicionar coluna rejectionReason (motivo da rejeição)
ALTER TABLE `properties` 
ADD COLUMN `rejectionReason` text DEFAULT NULL AFTER `approvedAt`;

-- Adicionar foreign key para assignedAgentId
ALTER TABLE `properties` 
ADD CONSTRAINT `properties_assignedAgentId_users_id_fk` 
FOREIGN KEY (`assignedAgentId`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Adicionar foreign key para approvedBy
ALTER TABLE `properties` 
ADD CONSTRAINT `properties_approvedBy_users_id_fk` 
FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Marcar todos os imóveis existentes como aprovados
UPDATE `properties` SET `isApproved` = true WHERE `isApproved` = false OR `isApproved` IS NULL;

-- ============================================
-- PRONTO! Migração concluída!
-- ============================================
