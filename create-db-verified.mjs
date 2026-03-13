import mysql from 'mysql2/promise';

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'rootpass123',
    });
    await connection.query('CREATE DATABASE IF NOT EXISTS administrador_de_propriedades;');
    console.log('✅ Database created successfully!');
    await connection.end();
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

test();
