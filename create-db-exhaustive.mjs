import mysql from 'mysql2/promise';

const hosts = ['127.0.0.1', '::1', 'localhost'];
const passwords = ['rootpass123', 'root', ''];

async function test() {
  for (const host of hosts) {
    for (const password of passwords) {
      console.log(`Trying: root:${password ? '****' : '(empty)'}@${host}`);
      try {
        const connection = await mysql.createConnection({
          host,
          port: 3306,
          user: 'root',
          password,
        });
        console.log(`✅ Handshake success for ${host} with ${password ? 'password' : 'no password'}`);
        await connection.query('CREATE DATABASE IF NOT EXISTS administrador_de_propriedades;');
        console.log(`✅ Database created/verified for ${host}`);
        await connection.end();
        console.log(`🎉 USE THIS: mysql://root:${password}@${host}:3306/administrador_de_propriedades`);
        process.exit(0);
      } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
      }
    }
  }
}

test();
