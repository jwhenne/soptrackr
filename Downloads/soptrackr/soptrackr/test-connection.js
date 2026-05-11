const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Crevalle2022!@db.kiitjmbvubweaezbncxg.supabase.co:5432/postgres'
});

async function testConnection() {
  try {
    console.log('Testing connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    console.log('Connection successful!', result.rows);
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
