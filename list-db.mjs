import mysql from 'mysql2/promise';

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'mysql'
    });
    const [rows] = await connection.query('SHOW DATABASES;');
    console.log('Available databases:');
    rows.forEach(row => console.log(`- ${row.Database}`));
    await connection.end();
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

test();
