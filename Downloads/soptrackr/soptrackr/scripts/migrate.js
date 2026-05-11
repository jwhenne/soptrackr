const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🚀 Starting SOPTrackr database setup...');

    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_initial_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running initial migration...');
    await pool.query(migrationSQL);

    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('🏢 Created tables:');
    console.log('  - organizations');
    console.log('  - dealerships');
    console.log('  - users');
    console.log('  - user_dealership_roles');
    console.log('  - parts');
    console.log('  - service_orders');
    console.log('  - parts_requests');
    console.log('  - audit_logs');
    console.log('');
    console.log('🔒 Enabled Row Level Security policies');
    console.log('📊 Inserted sample dealerships:');
    console.log('  - Downtown Toyota (DT001)');
    console.log('  - Westside Volvo (WV002)');
    console.log('');
    console.log('Next steps:');
    console.log('1. Set up Auth0 account and configure .env');
    console.log('2. Run: npm run dev');
    console.log('3. Visit: http://localhost:3000');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 Database connection failed. Make sure:');
      console.log('  - PostgreSQL is running');
      console.log('  - DATABASE_URL is set in .env');
      console.log('  - Database exists and is accessible');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Allow running directly with node
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
