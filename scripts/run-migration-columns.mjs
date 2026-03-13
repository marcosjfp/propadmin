// Script para adicionar colunas de aprovação ao banco de dados
// Execute com: node run-migration-columns.mjs

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada. Configure no arquivo .env');
    process.exit(1);
  }

  console.log('🔌 Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(connectionString);
  
  try {
    console.log('✅ Conectado!\n');

    // Verificar quais colunas já existem
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'properties' AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('📋 Colunas existentes:', existingColumns.join(', '));
    console.log('');

    // Lista de colunas para adicionar
    const columnsToAdd = [
      { name: 'assignedAgentId', sql: 'ADD COLUMN `assignedAgentId` int DEFAULT NULL AFTER `agentId`' },
      { name: 'customCommissionRate', sql: 'ADD COLUMN `customCommissionRate` int DEFAULT NULL AFTER `assignedAgentId`' },
      { name: 'isApproved', sql: 'ADD COLUMN `isApproved` boolean DEFAULT true NOT NULL AFTER `status`' },
      { name: 'approvedBy', sql: 'ADD COLUMN `approvedBy` int DEFAULT NULL AFTER `isApproved`' },
      { name: 'approvedAt', sql: 'ADD COLUMN `approvedAt` timestamp NULL AFTER `approvedBy`' },
      { name: 'rejectionReason', sql: 'ADD COLUMN `rejectionReason` text DEFAULT NULL AFTER `approvedAt`' },
    ];

    // Adicionar colunas que não existem
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adicionando coluna: ${col.name}...`);
        try {
          await connection.execute(`ALTER TABLE properties ${col.sql}`);
          console.log(`  ✅ Coluna ${col.name} adicionada`);
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log(`  ℹ️  Coluna ${col.name} já existe`);
          } else {
            throw err;
          }
        }
      } else {
        console.log(`✓ Coluna ${col.name} já existe`);
      }
    }

    // Tentar adicionar foreign keys (ignora erro se já existir)
    console.log('\n🔗 Verificando foreign keys...');
    
    try {
      await connection.execute(`
        ALTER TABLE properties 
        ADD CONSTRAINT properties_assignedAgentId_users_id_fk 
        FOREIGN KEY (assignedAgentId) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ FK assignedAgentId adicionada');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
        console.log('  ✓ FK assignedAgentId já existe');
      } else {
        console.log('  ⚠️ FK assignedAgentId:', err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE properties 
        ADD CONSTRAINT properties_approvedBy_users_id_fk 
        FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ FK approvedBy adicionada');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
        console.log('  ✓ FK approvedBy já existe');
      } else {
        console.log('  ⚠️ FK approvedBy:', err.message);
      }
    }

    // Atualizar imóveis existentes para aprovados
    console.log('\n🏠 Atualizando imóveis existentes...');
    const [result] = await connection.execute(`
      UPDATE properties SET isApproved = true WHERE isApproved = false OR isApproved IS NULL
    `);
    console.log(`  ✅ ${result.affectedRows} imóveis atualizados para aprovados`);

    // Mostrar estrutura final
    console.log('\n📊 Estrutura final da tabela properties:');
    const [finalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'properties' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    console.table(finalColumns);

    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await connection.end();
    console.log('\n🔌 Conexão encerrada');
  }
}

runMigration();
