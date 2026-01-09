-- Adiciona campos para workflow de aprovação de imóveis
-- Status "pendente" para imóveis criados por corretores que aguardam aprovação
-- Status "rejeitada" para imóveis que foram rejeitados pelo admin

-- Modificar a coluna status para incluir novos valores
ALTER TABLE `properties` 
  MODIFY COLUMN `status` ENUM('ativa', 'vendida', 'alugada', 'inativa', 'pendente', 'rejeitada') NOT NULL DEFAULT 'ativa';

-- Adicionar campo de aprovação
ALTER TABLE `properties` 
  ADD COLUMN `is_approved` BOOLEAN NOT NULL DEFAULT TRUE AFTER `custom_commission_rate`;

-- Adicionar referência ao usuário que aprovou
ALTER TABLE `properties` 
  ADD COLUMN `approved_by` INT AFTER `is_approved`;

-- Adicionar data de aprovação
ALTER TABLE `properties` 
  ADD COLUMN `approved_at` DATETIME AFTER `approved_by`;

-- Adicionar motivo de rejeição
ALTER TABLE `properties` 
  ADD COLUMN `rejection_reason` TEXT AFTER `approved_at`;

-- Adicionar foreign key para approved_by
ALTER TABLE `properties` 
  ADD CONSTRAINT `fk_properties_approved_by` 
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Atualizar imóveis existentes como aprovados (manter retrocompatibilidade)
UPDATE `properties` SET `is_approved` = TRUE WHERE `is_approved` IS NULL OR `is_approved` = FALSE;
