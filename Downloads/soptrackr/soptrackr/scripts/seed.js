const { Pool } = require('pg');

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🌱 Seeding SOPTrackr database with sample data...');

    // Add sample users
    console.log('👥 Adding sample users...');
    
    const users = [
      {
        email: 'admin@soptrackr.com',
        firstName: 'System',
        lastName: 'Admin',
        globalRole: 'super_admin'
      },
      {
        email: 'john.parts@downtown-toyota.com',
        firstName: 'John',
        lastName: 'Smith',
        globalRole: null
      },
      {
        email: 'sarah.advisor@downtown-toyota.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        globalRole: null
      },
      {
        email: 'mike.tech@downtown-toyota.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        globalRole: null
      },
      {
        email: 'lisa.parts@westside-volvo.com',
        firstName: 'Lisa',
        lastName: 'Brown',
        globalRole: null
      }
    ];

    for (const user of users) {
      await pool.query(`
        INSERT INTO users (email, first_name, last_name, global_role) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `, [user.email, user.firstName, user.lastName, user.globalRole]);
    }

    // Add user-dealership relationships
    console.log('🔗 Setting up user-dealership roles...');
    
    const roles = [
      { email: 'john.parts@downtown-toyota.com', dealership: 'DT001', role: 'parts_personnel' },
      { email: 'sarah.advisor@downtown-toyota.com', dealership: 'DT001', role: 'service_advisor' },
      { email: 'mike.tech@downtown-toyota.com', dealership: 'DT001', role: 'technician' },
      { email: 'lisa.parts@westside-volvo.com', dealership: 'WV002', role: 'parts_personnel' }
    ];

    for (const role of roles) {
      await pool.query(`
        INSERT INTO user_dealership_roles (user_id, dealership_id, role)
        SELECT u.id, d.id, $3
        FROM users u, dealerships d
        WHERE u.email = $1 AND d.code = $2
        ON CONFLICT (user_id, dealership_id) DO NOTHING
      `, [role.email, role.dealership, role.role]);
    }

    // Add sample parts for Downtown Toyota
    console.log('🔧 Adding sample parts inventory...');
    
    const dtParts = [
      {
        partNumber: 'TOY-12345-001',
        description: 'Oil Filter - Camry 2020-2024',
        manufacturer: 'Toyota',
        category: 'Filters',
        cost: 8.50,
        price: 15.99,
        quantity: 25,
        binLocation: 'A1-05'
      },
      {
        partNumber: 'TOY-67890-002',
        description: 'Brake Pads Front - RAV4 2019-2023',
        manufacturer: 'Toyota',
        category: 'Brakes',
        cost: 45.00,
        price: 89.99,
        quantity: 12,
        binLocation: 'B3-12'
      },
      {
        partNumber: 'TOY-54321-003',
        description: 'Air Filter - Corolla 2020-2024',
        manufacturer: 'Toyota',
        category: 'Filters',
        cost: 12.00,
        price: 24.99,
        quantity: 18,
        binLocation: 'A1-08'
      },
      {
        partNumber: 'TOY-98765-004',
        description: 'Spark Plugs (Set of 4) - Highlander V6',
        manufacturer: 'Toyota',
        category: 'Engine',
        cost: 28.00,
        price: 49.99,
        quantity: 8,
        binLocation: 'C2-15'
      }
    ];

    for (const part of dtParts) {
      await pool.query(`
        INSERT INTO parts (dealership_id, part_number, description, manufacturer, category, cost, price, quantity_on_hand, bin_location)
        SELECT d.id, $1, $2, $3, $4, $5, $6, $7, $8
        FROM dealerships d
        WHERE d.code = 'DT001'
      `, [part.partNumber, part.description, part.manufacturer, part.category, part.cost, part.price, part.quantity, part.binLocation]);
    }

    // Add sample parts for Westside Volvo
    const wvParts = [
      {
        partNumber: 'VOL-11111-001',
        description: 'Oil Filter - XC90 2020-2024',
        manufacturer: 'Volvo',
        category: 'Filters',
        cost: 12.00,
        price: 22.99,
        quantity: 15,
        binLocation: 'V1-03'
      },
      {
        partNumber: 'VOL-22222-002',
        description: 'Brake Discs Front - XC60 2018-2023',
        manufacturer: 'Volvo',
        category: 'Brakes',
        cost: 120.00,
        price: 199.99,
        quantity: 6,
        binLocation: 'V2-08'
      },
      {
        partNumber: 'VOL-33333-003',
        description: 'Cabin Air Filter - S60/S90/V60/V90',
        manufacturer: 'Volvo',
        category: 'Filters',
        cost: 18.00,
        price: 34.99,
        quantity: 10,
        binLocation: 'V1-12'
      }
    ];

    for (const part of wvParts) {
      await pool.query(`
        INSERT INTO parts (dealership_id, part_number, description, manufacturer, category, cost, price, quantity_on_hand, bin_location)
        SELECT d.id, $1, $2, $3, $4, $5, $6, $7, $8
        FROM dealerships d
        WHERE d.code = 'WV002'
      `, [part.partNumber, part.description, part.manufacturer, part.category, part.cost, part.price, part.quantity, part.binLocation]);
    }

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('👤 Sample Users Created:');
    console.log('  📧 admin@soptrackr.com (Super Admin)');
    console.log('  📧 john.parts@downtown-toyota.com (Parts Personnel)');
    console.log('  📧 sarah.advisor@downtown-toyota.com (Service Advisor)');
    console.log('  📧 mike.tech@downtown-toyota.com (Technician)');
    console.log('  📧 lisa.parts@westside-volvo.com (Parts Personnel)');
    console.log('');
    console.log('🔧 Sample Parts Added:');
    console.log('  🏢 Downtown Toyota: 4 parts with bin locations');
    console.log('  🏢 Westside Volvo: 3 parts with bin locations');
    console.log('');
    console.log('🎯 Key Test Scenarios:');
    console.log('  ✅ Parts personnel can see bin locations');
    console.log('  ❌ Service advisors/techs cannot see bin locations');
    console.log('  🔒 Users only see their dealership\'s data');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Allow running directly with node
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
