-- ============================================
-- SCRIPT COMPLETO PARA CRIAR BANCO DE DADOS
-- Administrador de Propriedades
-- Execute este script no Railway MySQL
-- ============================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `phone` varchar(20),
  `loginMethod` varchar(64),
  `role` enum('user','agent','admin') NOT NULL DEFAULT 'user',
  `isAgent` boolean DEFAULT false NOT NULL,
  `creci` varchar(50),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE PROPRIEDADES/IMÓVEIS
CREATE TABLE IF NOT EXISTS `properties` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('apartamento','casa','terreno','comercial','outro') NOT NULL,
  `transactionType` enum('venda','aluguel') NOT NULL,
  `price` int NOT NULL,
  `size` int NOT NULL,
  `rooms` int NOT NULL,
  `bathrooms` int NOT NULL,
  `hasBackyard` boolean NOT NULL DEFAULT false,
  `hasLivingRoom` boolean NOT NULL DEFAULT true,
  `hasKitchen` boolean NOT NULL DEFAULT true,
  `address` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(2) NOT NULL,
  `zipCode` varchar(10),
  `agentId` int NOT NULL,
  `status` enum('ativa','vendida','alugada','inativa') NOT NULL DEFAULT 'ativa',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `properties_agentId_idx` (`agentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA DE IMAGENS DAS PROPRIEDADES
CREATE TABLE IF NOT EXISTS `property_images` (
  `id` int AUTO_INCREMENT NOT NULL,
  `propertyId` int NOT NULL,
  `url` text NOT NULL,
  `filename` varchar(255) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `mimeType` varchar(50) NOT NULL,
  `size` int NOT NULL,
  `isPrimary` boolean DEFAULT false NOT NULL,
  `sortOrder` int DEFAULT 0 NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `property_images_propertyId_idx` (`propertyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA DE COMISSÕES
CREATE TABLE IF NOT EXISTS `commissions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `propertyId` int NOT NULL,
  `agentId` int NOT NULL,
  `transactionType` enum('venda','aluguel') NOT NULL,
  `transactionAmount` int NOT NULL,
  `commissionRate` int NOT NULL,
  `commissionAmount` int NOT NULL,
  `status` enum('pendente','paga','cancelada') NOT NULL DEFAULT 'pendente',
  `paymentDate` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `commissions_propertyId_idx` (`propertyId`),
  KEY `commissions_agentId_idx` (`agentId`),
  KEY `commissions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABELA DE AUDITORIA/HISTÓRICO
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `userName` varchar(255) DEFAULT 'Sistema',
  `userRole` varchar(50) DEFAULT 'system',
  `action` enum(
    'user_created',
    'user_updated', 
    'user_deleted',
    'user_role_changed',
    'user_login',
    'user_logout',
    'property_created',
    'property_updated',
    'property_deleted',
    'property_status_changed',
    'property_sold',
    'property_rented',
    'image_uploaded',
    'image_deleted',
    'image_primary_changed',
    'commission_created',
    'commission_status_changed',
    'commission_paid',
    'commission_cancelled',
    'system_error'
  ) NOT NULL,
  `entityType` enum('user','property','commission','image','system') NOT NULL,
  `entityId` int DEFAULT NULL,
  `entityName` varchar(255) DEFAULT NULL,
  `previousValue` json DEFAULT NULL,
  `newValue` json DEFAULT NULL,
  `description` text,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`userId`),
  KEY `idx_audit_entity` (`entityType`, `entityId`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ADICIONAR FOREIGN KEYS (relacionamentos)
ALTER TABLE `properties` 
  ADD CONSTRAINT `properties_agentId_users_id_fk` 
  FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE CASCADE;

ALTER TABLE `property_images` 
  ADD CONSTRAINT `property_images_propertyId_fk` 
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE;

ALTER TABLE `commissions` 
  ADD CONSTRAINT `commissions_propertyId_properties_id_fk` 
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE;

ALTER TABLE `commissions` 
  ADD CONSTRAINT `commissions_agentId_users_id_fk` 
  FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE CASCADE;

-- 7. CRIAR USUÁRIO ADMINISTRADOR INICIAL
-- Substitua os valores conforme necessário
INSERT INTO `users` (`openId`, `name`, `email`, `role`, `isAgent`) 
VALUES ('github-admin-inicial', 'Administrador', 'admin@exemplo.com', 'admin', false)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================
-- PRONTO! Banco de dados criado com sucesso!
-- ============================================
