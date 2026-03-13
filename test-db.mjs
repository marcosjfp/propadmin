import mysql from 'mysql2/promise';

const configs = [
  { host: 'localhost', port: 3306, user: 'root', password: '', database: 'administrador_de_propriedades' },
  { host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'administrador_de_propriedades' },
  { host: 'localhost', port: 3306, user: 'root', password: 'rootpass123', database: 'administrador_de_propriedades' },
  { host: 'localhost', port: 3306, user: 'root', password: '', database: 'railway' },
  { host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'railway' },
  { host: 'localhost', port: 3307, user: 'root', password: 'rootpass123', database: 'administrador_de_propriedades' },
];

async function test() {
  for (const config of configs) {
    console.log(`Testing: mysql://${config.user}:${config.password ? '****' : ''}@${config.host}:${config.port}/${config.database}`);
    try {
      const connection = await mysql.createConnection(config);
      console.log('✅ SUCCESS!');
      await connection.end();
      process.exit(0);
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }
  }
  console.log('All tests failed.');
  process.exit(1);
}

test();
