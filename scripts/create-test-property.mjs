import mysql from 'mysql2/promise';
import 'dotenv/config';

async function createTestProperty() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required. Set it in your .env file.');
    process.exit(1);
  }
  const connection = await mysql.createConnection(dbUrl);
  
  console.log('Conectado ao banco de dados...');
  
  // Criar imóvel de teste ativo e aprovado
  await connection.query(`
    INSERT INTO properties (
      title, description, type, transactionType, price, size, rooms, bathrooms,
      hasBackyard, hasLivingRoom, hasKitchen, address, city, state, zipCode,
      agentId, status, is_approved, approved_by, approved_at
    ) VALUES (
      'Casa de Praia Luxuosa', 
      'Linda casa de frente para o mar com vista panorâmica. Acabamento de alto padrão, piscina privativa e área gourmet completa.', 
      'casa', 
      'venda', 
      85000000, 
      250, 
      4, 
      3, 
      1, 
      1, 
      1, 
      'Av. Beira Mar, 1000', 
      'Florianópolis', 
      'SC', 
      '88000-000', 
      1, 
      'ativa', 
      1, 
      1, 
      NOW()
    )
  `);
  
  console.log('Imóvel de teste criado com sucesso!');
  
  // Verificar
  const [rows] = await connection.query('SELECT id, title, status, is_approved FROM properties');
  console.log('Imóveis no banco:');
  console.log(rows);
  
  await connection.end();
}

createTestProperty().catch(console.error);
