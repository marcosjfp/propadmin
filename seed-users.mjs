import mysql from 'mysql2/promise';

async function seed() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'rootpass123',
    database: 'administrador_de_propriedades'
  });

  console.log('🌱 Seeding users...');

  const users = [
    ['admin-inicial', 'Administrador', 'admin@exemplo.com', 'admin', 0, null],
    ['agent-inicial', 'Corretor Demo', 'corretor@exemplo.com', 'agent', 1, 'CRECI-12345'],
    ['user-inicial', 'Usuário Demo', 'usuario@exemplo.com', 'user', 0, null],
    ['dev_owner_12345', 'Dev Owner', 'dev@example.com', 'admin', 0, null], // Match OWNER_ID in .env.local
  ];

  for (const user of users) {
    await connection.query(`
      INSERT INTO users (openId, name, email, role, isAgent, creci) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), isAgent = VALUES(isAgent);
    `, user);
  }

  console.log('✅ Users seeded successfully!');
  await connection.end();
}

seed().catch(console.error);
