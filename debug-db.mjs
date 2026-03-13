import mysql from 'mysql2/promise';

async function test() {
  const configs = [
    { host: '127.0.0.1', port: 3306, user: 'root', password: '' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'root' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'rootpass123' },
    { host: 'localhost', port: 3306, user: 'root', password: '' },
    { host: 'localhost', port: 3306, user: 'root', password: 'root' },
    { host: 'localhost', port: 3306, user: 'root', password: 'rootpass123' },
  ];

  for (const config of configs) {
    console.log(`Testing: ${config.user}:${config.password ? '****' : '(empty)'}@${config.host}:${config.port}`);
    try {
      const connection = await mysql.createConnection(config);
      console.log('✅ Handshake SUCCESS!');
      const [rows] = await connection.query('SHOW DATABASES;');
      console.log('Databases:', rows.map(r => r.Database || r.database));
      await connection.end();
      return;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }
  }
  console.log('All tests failed.');
}

test();
