import mysql from 'mysql2/promise';

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
    });
    await connection.query('CREATE DATABASE IF NOT EXISTS administrador_de_propriedades;');
    console.log('✅ Database created successfully!');
    await connection.end();
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

test();
