-- SOPTrackr Initial Database Schema
-- Migration: 001_initial_setup.sql

-- Organizations table (your company)
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(100),
  logo_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dealerships table
CREATE TABLE dealerships (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "DT001", "WV002"
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth0_user_id VARCHAR(255) UNIQUE, -- Auth0 integration
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  global_role VARCHAR(50), -- 'super_admin' or null
  active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Dealership relationship with roles
CREATE TABLE user_dealership_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'parts_personnel', 'service_advisor', 'technician'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, dealership_id)
);

-- Parts inventory table
CREATE TABLE parts (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  description TEXT,
  manufacturer VARCHAR(100),
  category VARCHAR(100),
  cost DECIMAL(10,2),
  price DECIMAL(10,2),
  quantity_on_hand INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  bin_location VARCHAR(50), -- This is the field we're protecting!
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Service orders table (for future SOP tracking)
CREATE TABLE service_orders (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
  order_number VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255),
  vehicle_year INTEGER,
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_vin VARCHAR(17),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  assigned_tech_id INTEGER REFERENCES users(id),
  advisor_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parts requests/SOPs table
CREATE TABLE parts_requests (
  id SERIAL PRIMARY KEY,
  service_order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
  part_id INTEGER REFERENCES parts(id),
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
  requested_by INTEGER REFERENCES users(id),
  part_number VARCHAR(100) NOT NULL, -- In case part not in inventory
  description TEXT,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'located', 'fulfilled'
  bin_location_found VARCHAR(50), -- Set by parts personnel
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log for tracking changes
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER REFERENCES dealerships(id),
  user_id INTEGER REFERENCES users(id),
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dealerships_org ON dealerships(organization_id);
CREATE INDEX idx_dealerships_code ON dealerships(code);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth0 ON users(auth0_user_id);
CREATE INDEX idx_user_dealership_roles_user ON user_dealership_roles(user_id);
CREATE INDEX idx_user_dealership_roles_dealership ON user_dealership_roles(dealership_id);
CREATE INDEX idx_parts_dealership ON parts(dealership_id);
CREATE INDEX idx_parts_number ON parts(dealership_id, part_number);
CREATE INDEX idx_service_orders_dealership ON service_orders(dealership_id);
CREATE INDEX idx_parts_requests_dealership ON parts_requests(dealership_id);
CREATE INDEX idx_parts_requests_service_order ON parts_requests(service_order_id);

-- Enable Row Level Security
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY dealership_isolation_dealerships ON dealerships
  FOR ALL TO authenticated_users
  USING (
    id::TEXT = current_setting('app.current_dealership_id', true) OR
    current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY dealership_isolation_parts ON parts
  FOR ALL TO authenticated_users
  USING (
    dealership_id::TEXT = current_setting('app.current_dealership_id', true) OR
    current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY dealership_isolation_service_orders ON service_orders
  FOR ALL TO authenticated_users
  USING (
    dealership_id::TEXT = current_setting('app.current_dealership_id', true) OR
    current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY dealership_isolation_parts_requests ON parts_requests
  FOR ALL TO authenticated_users
  USING (
    dealership_id::TEXT = current_setting('app.current_dealership_id', true) OR
    current_setting('app.user_role', true) = 'super_admin'
  );

-- Insert initial organization
INSERT INTO organizations (name, domain) VALUES ('SOPTrackr Demo', 'soptrackr.com');

-- Insert sample dealerships
INSERT INTO dealerships (organization_id, name, code, address, phone) VALUES 
(1, 'Downtown Toyota', 'DT001', '123 Main St, Your City, ST 12345', '(555) 123-4567'),
(1, 'Westside Volvo', 'WV002', '456 West Ave, Your City, ST 12345', '(555) 987-6543');
