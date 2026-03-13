import mysql from 'mysql2/promise';

const hosts = ['127.0.0.1', '::1', 'localhost'];
const passwords = ['', 'root', 'rootpass123'];

async function test() {
  for (const host of hosts) {
    for (const password of passwords) {
      console.log(`Testing: host=${host}, user=root, password=${password ? '****' : '(empty)'}`);
      try {
        const connection = await mysql.createConnection({
          host,
          port: 3306,
          user: 'root',
          password,
        });
        console.log('✅ Connection handshaked!');
        const [rows] = await connection.query('SHOW DATABASES;');
        console.log('Databases:', rows.map(r => r.Database || r.database));
        await connection.end();
        process.exit(0);
      } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
      }
    }
  }
}

test();
