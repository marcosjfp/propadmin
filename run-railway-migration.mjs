// Script para executar migração no banco Railway
// Execute com: node run-railway-migration.mjs "mysql://usuario:senha@host:porta/database"

import mysql from 'mysql2/promise';

const railwayUrl = process.argv[2];

if (!railwayUrl) {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           MIGRAÇÃO DO BANCO DE DADOS - RAILWAY                     ║
╚════════════════════════════════════════════════════════════════════╝

Para executar este script, você precisa da URL de conexão do MySQL do Railway.

🔍 COMO ENCONTRAR A URL:

1. Acesse: https://railway.app/dashboard
2. Clique no seu projeto "propadmin"
3. Clique no serviço MySQL (ícone de banco de dados)
4. Vá na aba "Variables" ou "Connect"
5. Copie a variável DATABASE_URL ou MYSQL_URL
   (Formato: mysql://user:password@host:port/database)

📋 EXECUTE O COMANDO:

   node run-railway-migration.mjs "SUA_URL_AQUI"

Exemplo:
   node run-railway-migration.mjs "mysql://root:abc123@mysql.railway.internal:3306/railway"

`);
  process.exit(1);
}

async function runMigration() {
  console.log('🔌 Conectando ao banco Railway...');
  
  let connection;
  try {
    connection = await mysql.createConnection(railwayUrl);
    console.log('✅ Conectado ao Railway!\n');

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
      { name: 'assignedAgentId', sql: 'ADD COLUMN `assignedAgentId` int DEFAULT NULL' },
      { name: 'customCommissionRate', sql: 'ADD COLUMN `customCommissionRate` int DEFAULT NULL' },
      { name: 'isApproved', sql: 'ADD COLUMN `isApproved` boolean DEFAULT true NOT NULL' },
      { name: 'approvedBy', sql: 'ADD COLUMN `approvedBy` int DEFAULT NULL' },
      { name: 'approvedAt', sql: 'ADD COLUMN `approvedAt` timestamp NULL' },
      { name: 'rejectionReason', sql: 'ADD COLUMN `rejectionReason` text DEFAULT NULL' },
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
            console.log(`  ⚠️ Erro: ${err.message}`);
          }
        }
      } else {
        console.log(`✓ Coluna ${col.name} já existe`);
      }
    }

    // Criar usuários de teste
    console.log('\n👥 Criando usuários de teste...');
    
    const usersToCreate = [
      { openId: 'admin-inicial', name: 'Administrador', email: 'admin@exemplo.com', role: 'admin', isAgent: false, creci: null },
      { openId: 'agent-inicial', name: 'Corretor Demo', email: 'corretor@exemplo.com', role: 'agent', isAgent: true, creci: 'CRECI-12345' },
      { openId: 'user-inicial', name: 'Usuário Demo', email: 'usuario@exemplo.com', role: 'user', isAgent: false, creci: null },
    ];

    for (const user of usersToCreate) {
      try {
        await connection.execute(`
          INSERT INTO users (openId, name, email, role, isAgent, creci) 
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE name = VALUES(name)
        `, [user.openId, user.name, user.email, user.role, user.isAgent, user.creci]);
        console.log(`  ✅ ${user.role}: ${user.name}`);
      } catch (err) {
        console.log(`  ⚠️ ${user.role}: ${err.message}`);
      }
    }

    // Atualizar imóveis existentes para aprovados
    console.log('\n🏠 Atualizando imóveis existentes...');
    try {
      const [result] = await connection.execute(`
        UPDATE properties SET isApproved = true WHERE isApproved = false OR isApproved IS NULL
      `);
      console.log(`  ✅ ${result.affectedRows} imóveis atualizados para aprovados`);
    } catch (err) {
      console.log(`  ℹ️ ${err.message}`);
    }

    // Mostrar usuários
    console.log('\n📊 Usuários no banco:');
    const [users] = await connection.execute('SELECT id, name, email, role FROM users');
    console.table(users);

    // Mostrar imóveis
    console.log('\n📊 Imóveis no banco:');
    const [properties] = await connection.execute('SELECT id, title, status FROM properties LIMIT 10');
    if (properties.length > 0) {
      console.table(properties);
    } else {
      console.log('  (nenhum imóvel cadastrado)');
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🚀 Agora você pode acessar a aplicação no Railway');
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dica: Verifique se a URL está correta e se o banco está acessível externamente.');
      console.log('   No Railway, vá em MySQL > Settings > Networking e habilite "Public Networking"');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

runMigration();
