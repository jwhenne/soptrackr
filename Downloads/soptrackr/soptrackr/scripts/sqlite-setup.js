const Database = require('better-sqlite3');
const path = require('path');

function setupSQLite() {
  try {
    console.log('🚀 Setting up SOPTrackr with SQLite...');
    
    const dbPath = path.join(process.cwd(), 'soptrackr.db');
    const db = new Database(dbPath);
    
    // Create tables
    db.exec(`
      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        domain TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Dealerships table  
      CREATE TABLE IF NOT EXISTS dealerships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER REFERENCES organizations(id),
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT,
        phone TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        global_role TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User-Dealership roles
      CREATE TABLE IF NOT EXISTS user_dealership_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        dealership_id INTEGER REFERENCES dealerships(id),
        role TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, dealership_id)
      );

      -- Parts table (with bin_location!)
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealership_id INTEGER REFERENCES dealerships(id),
        part_number TEXT NOT NULL,
        description TEXT,
        manufacturer TEXT,
        cost REAL,
        price REAL,
        quantity_on_hand INTEGER DEFAULT 0,
        bin_location TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert sample data
    db.exec(`
      INSERT OR IGNORE INTO organizations (id, name, domain) VALUES (1, 'SOPTrackr Demo', 'soptrackr.com');
      
      INSERT OR IGNORE INTO dealerships (id, organization_id, name, code, address, phone) VALUES 
      (1, 1, 'Downtown Toyota', 'DT001', '123 Main St, Your City, ST 12345', '(555) 123-4567'),
      (2, 1, 'Westside Volvo', 'WV002', '456 West Ave, Your City, ST 12345', '(555) 987-6543');
      
      INSERT OR IGNORE INTO users (id, email, first_name, last_name, global_role) VALUES
      (1, 'admin@soptrackr.com', 'System', 'Admin', 'super_admin'),
      (2, 'john.parts@downtown-toyota.com', 'John', 'Smith', null),
      (3, 'sarah.advisor@downtown-toyota.com', 'Sarah', 'Johnson', null);
      
      INSERT OR IGNORE INTO user_dealership_roles (user_id, dealership_id, role) VALUES
      (2, 1, 'parts_personnel'),
      (3, 1, 'service_advisor');
      
      INSERT OR IGNORE INTO parts (dealership_id, part_number, description, manufacturer, cost, price, quantity_on_hand, bin_location) VALUES
      (1, 'TOY-12345', 'Oil Filter - Camry 2020-2024', 'Toyota', 8.50, 15.99, 25, 'A1-05'),
      (1, 'TOY-67890', 'Brake Pads Front - RAV4', 'Toyota', 45.00, 89.99, 12, 'B3-12');
    `);
    
    console.log('✅ SQLite database created successfully!');
    console.log('📁 Database file: soptrackr.db');
    console.log('🎯 Sample data added with bin locations!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupSQLite();