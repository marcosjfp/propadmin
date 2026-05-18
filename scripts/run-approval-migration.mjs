import mysql from 'mysql2/promise';
import 'dotenv/config';

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required. Set it in your .env file.');
    process.exit(1);
  }
  const connection = await mysql.createConnection({
    uri: dbUrl,
    multipleStatements: true
  });
  
  console.log('Conectado ao banco de dados...');
  
  const statements = [
    `ALTER TABLE properties MODIFY COLUMN status ENUM('ativa', 'vendida', 'alugada', 'inativa', 'pendente', 'rejeitada') NOT NULL DEFAULT 'ativa'`,
    `ALTER TABLE properties ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE properties ADD COLUMN approved_by INT`,
    `ALTER TABLE properties ADD COLUMN approved_at DATETIME`,
    `ALTER TABLE properties ADD COLUMN rejection_reason TEXT`,
    `ALTER TABLE properties ADD CONSTRAINT fk_properties_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL`
  ];
  
  for (const sql of statements) {
    try {
      await connection.query(sql);
      console.log('OK:', sql.substring(0, 70) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log('JA EXISTE:', sql.substring(0, 70) + '...');
      } else {
        console.log('ERRO:', err.message);
      }
    }
  }
  
  console.log('\nMigration concluida!');
  await connection.end();
}

runMigration().catch(console.error);
