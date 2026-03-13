// Script para corrigir imóveis e adicionar usuários de teste
// Execute com: node run-fix-approval.mjs

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function runFix() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada. Configure no arquivo .env');
    process.exit(1);
  }

  console.log('🔌 Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(connectionString);
  
  try {
    console.log('✅ Conectado!\n');

    // 1. Criar usuários de teste
    console.log('👥 Criando usuários de teste...');
    
    await connection.execute(`
      INSERT INTO users (openId, name, email, role, isAgent, creci) 
      VALUES ('admin-inicial', 'Administrador', 'admin@exemplo.com', 'admin', false, NULL)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('  ✅ Admin criado/atualizado');

    await connection.execute(`
      INSERT INTO users (openId, name, email, role, isAgent, creci) 
      VALUES ('agent-inicial', 'Corretor Demo', 'corretor@exemplo.com', 'agent', true, 'CRECI-12345')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('  ✅ Corretor criado/atualizado');

    await connection.execute(`
      INSERT INTO users (openId, name, email, role, isAgent, creci) 
      VALUES ('user-inicial', 'Usuário Demo', 'usuario@exemplo.com', 'user', false, NULL)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('  ✅ Usuário criado/atualizado');

    // 2. Verificar se coluna isApproved existe
    console.log('\n🔍 Verificando estrutura da tabela properties...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'isApproved'
    `);
    
    if (columns.length > 0) {
      // 3. Atualizar imóveis para aprovados
      console.log('\n🏠 Atualizando imóveis pendentes para aprovados...');
      const [result] = await connection.execute(`
        UPDATE properties 
        SET isApproved = true, status = 'ativa'
        WHERE status = 'pendente' OR isApproved = false
      `);
      console.log(`  ✅ ${result.affectedRows} imóveis atualizados`);
    } else {
      console.log('  ℹ️  Coluna isApproved não existe (schema antigo)');
    }

    // 4. Mostrar resultado
    console.log('\n📊 Usuários no banco:');
    const [users] = await connection.execute('SELECT id, name, email, role FROM users');
    console.table(users);

    console.log('\n📊 Imóveis no banco:');
    const [properties] = await connection.execute('SELECT id, title, status FROM properties LIMIT 10');
    if (properties.length > 0) {
      console.table(properties);
    } else {
      console.log('  (nenhum imóvel cadastrado)');
    }

    console.log('\n✅ Correções aplicadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 Conexão encerrada');
  }
}

runFix();
