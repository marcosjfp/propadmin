import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'rootpass123',
  database: 'administrador_de_propriedades',
});

console.log('✅ Connected to database');

// 1. Add columns if they don't exist
try {
  await conn.query('ALTER TABLE users ADD COLUMN username VARCHAR(64) UNIQUE');
  console.log('✅ Added column: username');
} catch (e) {
  console.log('⚠️  Column username may already exist:', e.message);
}

try {
  await conn.query('ALTER TABLE users ADD COLUMN passwordHash TEXT');
  console.log('✅ Added column: passwordHash');
} catch (e) {
  console.log('⚠️  Column passwordHash may already exist:', e.message);
}

try {
  await conn.query("ALTER TABLE users ADD COLUMN status ENUM('active','pending','rejected') NOT NULL DEFAULT 'active'");
  console.log('✅ Added column: status');
} catch (e) {
  console.log('⚠️  Column status may already exist:', e.message);
}

// 2. Seed admin user (upsert)
const adminHash = await bcrypt.hash('admin', 10);
await conn.query(`
  INSERT INTO users (openId, username, name, email, role, loginMethod, passwordHash, status)
  VALUES ('admin-user', 'admin', 'Administrador', 'admin@sistema.com', 'admin', 'local', ?, 'active')
  ON DUPLICATE KEY UPDATE
    username = 'admin',
    name = 'Administrador',
    role = 'admin',
    loginMethod = 'local',
    passwordHash = ?,
    status = 'active'
`, [adminHash, adminHash]);
console.log('✅ Admin user seeded (username: admin, password: admin)');

// 3. Set password for all existing non-admin users that have no passwordHash
const defaultHash = await bcrypt.hash('user123', 10);
const [existingUsers] = await conn.query('SELECT id, openId, email, role, username FROM users WHERE (passwordHash IS NULL OR passwordHash = "") AND openId != "admin-user"');

for (const user of existingUsers) {
  // Generate a username from email or openId
  let username = user.username;
  if (!username) {
    username = user.email
      ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      : user.openId.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30).toLowerCase();
    // Ensure uniqueness
    username = username || `user_${user.id}`;
  }
  // Check for username conflicts and add suffix if needed
  const [rows] = await conn.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, user.id]);
  if (rows.length > 0) {
    username = `${username}_${user.id}`;
  }
  await conn.query(
    'UPDATE users SET passwordHash = ?, username = ?, status = "active" WHERE id = ?',
    [defaultHash, username, user.id]
  );
  console.log(`✅ Set password for user id=${user.id} (username: ${username}, password: user123)`);
}

console.log('\n🎉 Migration complete!');
console.log('   Admin login → username: admin, password: admin');
console.log('   Other users → password: user123');
await conn.end();
