-- ============================================
-- SCRIPT PARA CORRIGIR IMÓVEIS E ADICIONAR USUÁRIOS
-- Execute este script no Railway MySQL para:
-- 1. Criar usuários de teste (admin, agent, user)
-- 2. Marcar todos os imóveis como aprovados e ativos
-- ============================================

-- 1. CRIAR USUÁRIOS DE TESTE (se não existirem)
INSERT INTO `users` (`openId`, `name`, `email`, `role`, `isAgent`, `creci`) 
VALUES ('admin-inicial', 'Administrador', 'admin@exemplo.com', 'admin', false, NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `users` (`openId`, `name`, `email`, `role`, `isAgent`, `creci`) 
VALUES ('agent-inicial', 'Corretor Demo', 'corretor@exemplo.com', 'agent', true, 'CRECI-12345')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `users` (`openId`, `name`, `email`, `role`, `isAgent`, `creci`) 
VALUES ('user-inicial', 'Usuário Demo', 'usuario@exemplo.com', 'user', false, NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. VERIFICAR SE AS COLUNAS DE APROVAÇÃO EXISTEM (pode dar erro se já existir - tudo bem)
-- Se der erro "Duplicate column name", ignore - significa que a coluna já existe
-- ALTER TABLE `properties` ADD COLUMN `isApproved` boolean DEFAULT true NOT NULL;
-- ALTER TABLE `properties` ADD COLUMN `approvedBy` int DEFAULT NULL;
-- ALTER TABLE `properties` ADD COLUMN `approvedAt` timestamp NULL;
-- ALTER TABLE `properties` ADD COLUMN `rejectionReason` text DEFAULT NULL;
-- ALTER TABLE `properties` ADD COLUMN `assignedAgentId` int DEFAULT NULL;
-- ALTER TABLE `properties` ADD COLUMN `customCommissionRate` int DEFAULT NULL;

-- 3. ATUALIZAR TODOS OS IMÓVEIS PARA APROVADOS E ATIVOS
UPDATE `properties` 
SET `isApproved` = true, 
    `status` = 'ativa'
WHERE `status` = 'pendente' OR `isApproved` = false;

-- 4. VERIFICAR RESULTADO
SELECT 'Usuários criados:' as info;
SELECT id, name, email, role FROM users;

SELECT 'Imóveis atualizados:' as info;
SELECT id, title, status, isApproved FROM properties;

-- ============================================
-- PRONTO! Correções aplicadas com sucesso!
-- ============================================
