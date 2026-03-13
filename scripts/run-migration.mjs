// Script para executar a migration manualmente
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:rootpass123@localhost:3307/administrador_de_propriedades';

async function runMigration() {
  console.log('🔗 Conectando ao banco...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('✅ Conectado! Executando migration...');
    
    // Verificar se as colunas já existem
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'properties' 
      AND COLUMN_NAME IN ('assignedAgentId', 'customCommissionRate')
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    // Adicionar assignedAgentId se não existir
    if (!existingColumns.includes('assignedAgentId')) {
      console.log('📝 Adicionando coluna assignedAgentId...');
      await connection.query(`
        ALTER TABLE properties ADD COLUMN assignedAgentId INT NULL
      `);
      console.log('✅ Coluna assignedAgentId adicionada!');
    } else {
      console.log('ℹ️ Coluna assignedAgentId já existe');
    }
    
    // Adicionar customCommissionRate se não existir
    if (!existingColumns.includes('customCommissionRate')) {
      console.log('📝 Adicionando coluna customCommissionRate...');
      await connection.query(`
        ALTER TABLE properties ADD COLUMN customCommissionRate INT NULL
      `);
      console.log('✅ Coluna customCommissionRate adicionada!');
    } else {
      console.log('ℹ️ Coluna customCommissionRate já existe');
    }
    
    // Verificar se o índice já existe
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'properties' 
      AND INDEX_NAME = 'idx_properties_assigned_agent'
    `);
    
    if (indexes.length === 0) {
      console.log('📝 Criando índice...');
      await connection.query(`
        CREATE INDEX idx_properties_assigned_agent ON properties (assignedAgentId)
      `);
      console.log('✅ Índice criado!');
    } else {
      console.log('ℹ️ Índice já existe');
    }
    
    // Verificar se a foreign key já existe
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'properties' 
      AND CONSTRAINT_NAME = 'fk_properties_assigned_agent'
    `);
    
    if (fks.length === 0) {
      console.log('📝 Adicionando foreign key...');
      await connection.query(`
        ALTER TABLE properties ADD CONSTRAINT fk_properties_assigned_agent 
        FOREIGN KEY (assignedAgentId) REFERENCES users (id) ON DELETE SET NULL
      `);
      console.log('✅ Foreign key adicionada!');
    } else {
      console.log('ℹ️ Foreign key já existe');
    }
    
    console.log('\n🎉 Migration concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
