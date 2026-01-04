-- Migration: Adicionar tabela de auditoria/histórico
-- Esta tabela rastreia todas as ações importantes no sistema

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(255) NOT NULL DEFAULT 'Sistema',
  `user_role` varchar(50) NOT NULL DEFAULT 'system',
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
  `entity_type` enum('user','property','commission','image','system') NOT NULL,
  `entity_id` int DEFAULT NULL,
  `entity_name` varchar(255) DEFAULT NULL,
  `previous_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `description` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign key para user_id (opcional, pois alguns logs podem não ter user_id)
-- ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;
