-- Create Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance NUMERIC NOT NULL,
  toll_cost NUMERIC NOT NULL,
  est_days INT NOT NULL
);

-- Create Trucks Table
CREATE TABLE IF NOT EXISTS trucks (
  id VARCHAR(50) PRIMARY KEY,
  plate VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  capacity NUMERIC NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  location VARCHAR(100) NOT NULL,
  last_service DATE NULL,
  status VARCHAR(50) NOT NULL,
  driver_id VARCHAR(50) NULL
);

-- Create Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  license VARCHAR(100) NOT NULL,
  license_expiry DATE NOT NULL,
  rating NUMERIC DEFAULT 5.0,
  status VARCHAR(50) NOT NULL,
  trips_completed INT DEFAULT 0,
  truck_id VARCHAR(50) NULL
);

-- Create Trips Table (with manual round-trip attributes, no cargo/weight)
CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(50) PRIMARY KEY,
  route_id VARCHAR(50) NULL,
  truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE SET NULL,
  driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE SET NULL,
  source VARCHAR(100) NOT NULL, -- Outward From
  destination VARCHAR(100) NOT NULL, -- Outward To
  distance NUMERIC NULL, -- Outward Distance
  toll_cost NUMERIC NULL, -- Outward Toll
  return_source VARCHAR(100) NULL, -- Return From
  return_destination VARCHAR(100) NULL, -- Return To
  return_distance NUMERIC NULL, -- Return Distance
  return_toll_cost NUMERIC NULL, -- Return Toll Cost
  cargo VARCHAR(100) NULL,
  weight NUMERIC NULL,
  status VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INT DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  expense NUMERIC DEFAULT 0
);

-- Create Maintenance Table
CREATE TABLE IF NOT EXISTS maintenance (
  id VARCHAR(50) PRIMARY KEY,
  truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(100) NOT NULL,
  cost NUMERIC NOT NULL,
  status VARCHAR(50) NOT NULL
);

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL
);

-- Create Financial Accounts Table (with Account Number and IFSC)
CREATE TABLE IF NOT EXISTS financial_accounts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  balance NUMERIC DEFAULT 0,
  account_number VARCHAR(50) NULL,
  ifsc_code VARCHAR(20) NULL,
  bank_name VARCHAR(100) NULL
);

-- Create Accounts Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Income', 'Expense')),
  category VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  reference_id VARCHAR(50) NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash'
);

-- Create Fuel Logs Table (linked to trips)
CREATE TABLE IF NOT EXISTS fuel_logs (
  id VARCHAR(50) PRIMARY KEY,
  truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id VARCHAR(50) NULL REFERENCES trips(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price_per_liter NUMERIC NOT NULL CHECK (price_per_liter > 0),
  total_cost NUMERIC NOT NULL CHECK (total_cost > 0),
  odometer NUMERIC NOT NULL CHECK (odometer >= 0),
  payment_method VARCHAR(50) NOT NULL,
  reference_id VARCHAR(50) NULL
);

-- Create DEF (Diesel Exhaust Fluid / AdBlue) Logs Table (linked to trips)
CREATE TABLE IF NOT EXISTS def_logs (
  id VARCHAR(50) PRIMARY KEY,
  truck_id VARCHAR(50) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id VARCHAR(50) NULL REFERENCES trips(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price_per_liter NUMERIC NOT NULL CHECK (price_per_liter > 0),
  total_cost NUMERIC NOT NULL CHECK (total_cost > 0),
  odometer NUMERIC NOT NULL CHECK (odometer >= 0),
  payment_method VARCHAR(50) NOT NULL,
  reference_id VARCHAR(50) NULL
);

-- -----------------------------------------------------------------------------
-- SEED DATA CONFIGURATION
-- -----------------------------------------------------------------------------

-- Seed Routes
INSERT INTO routes (id, name, source, destination, distance, toll_cost, est_days) VALUES
('RTE-001', 'Mumbai - Delhi Corridor', 'Mumbai', 'Delhi', 1400, 8500, 4),
('RTE-002', 'Bengaluru - Chennai Expressway', 'Bengaluru', 'Chennai', 350, 2400, 1),
('RTE-003', 'Kolkata - Ahmedabad Highway', 'Kolkata', 'Ahmedabad', 2000, 12000, 6),
('RTE-004', 'Delhi - Jaipur Route', 'Delhi', 'Jaipur', 270, 1800, 1)
ON CONFLICT (id) DO NOTHING;

-- Seed Drivers
INSERT INTO drivers (id, name, phone, license, license_expiry, rating, status, trips_completed, truck_id) VALUES
('DRV-001', 'Rajesh Kumar', '+91 98765 43210', 'DL-1420180098765', '2028-12-31', 4.8, 'Available', 24, 'TRK-001'),
('DRV-002', 'Amit Singh', '+91 87654 32109', 'DL-1220150087654', '2027-06-30', 4.5, 'On Duty', 18, 'TRK-002'),
('DRV-003', 'Gurpreet Singh', '+91 76543 21098', 'PB-0820120076543', '2026-05-15', 4.9, 'Available', 42, 'TRK-003'),
('DRV-004', 'Vijay Yadav', '+91 91234 56789', 'MH-1220190012345', '2029-08-22', 4.2, 'On Duty', 9, 'TRK-004')
ON CONFLICT (id) DO NOTHING;

-- Seed Trucks
INSERT INTO trucks (id, plate, model, capacity, fuel_type, location, last_service, status, driver_id) VALUES
('TRK-001', 'MH-12-QW-9876', 'BharatBenz 4828R', 30, 'Diesel', 'Mumbai', '2026-04-10', 'Idle', 'DRV-001'),
('TRK-002', 'HR-55-AS-1234', 'Tata Prima 5530.S', 40, 'Diesel', 'Delhi', '2026-05-18', 'On Route', 'DRV-002'),
('TRK-003', 'PB-65-XX-8888', 'Mahindra Blazo X 49', 35, 'LNG', 'Bengaluru', '2026-02-05', 'Idle', 'DRV-003'),
('TRK-004', 'MH-43-YT-4321', 'Ashok Leyland 4220', 28, 'CNG', 'Jaipur', '2026-03-24', 'On Route', 'DRV-004')
ON CONFLICT (id) DO NOTHING;

-- Seed Trips
INSERT INTO trips (id, route_id, truck_id, driver_id, source, destination, distance, toll_cost, return_source, return_destination, return_distance, return_toll_cost, cargo, weight, status, start_date, end_date, progress, revenue, expense) VALUES
('TRP-001', 'RTE-001', 'TRK-002', 'DRV-002', 'Mumbai', 'Delhi', 1400, 8500, 'Delhi', 'Mumbai', 1400, 8500, NULL, NULL, 'In Transit', '2026-07-12', '2026-07-16', 75, 120000, 42000),
('TRP-002', 'RTE-004', 'TRK-004', 'DRV-004', 'Delhi', 'Jaipur', 270, 1800, 'Jaipur', 'Delhi', 270, 1800, NULL, NULL, 'In Transit', '2026-07-15', '2026-07-16', 15, 45000, 15000),
('TRP-003', 'RTE-002', 'TRK-001', 'DRV-001', 'Bengaluru', 'Chennai', 350, 2400, 'Chennai', 'Bengaluru', 350, 2400, NULL, NULL, 'Delivered', '2026-07-08', '2026-07-09', 100, 38000, 12000)
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance
INSERT INTO maintenance (id, truck_id, date, type, cost, status) VALUES
('MNT-001', 'TRK-003', '2026-06-15', 'Engine Overhaul & Oil Filter Replacement', 32000, 'Completed'),
('MNT-002', 'TRK-001', '2026-07-10', 'Brake pad replacement & wheel alignment', 12500, 'Completed')
ON CONFLICT (id) DO NOTHING;

-- Seed Users
-- Password is 'admin123' (bcrypt hash)
INSERT INTO users (username, password, name, role) VALUES
('admin', '$2a$10$9F00hPq9N8wN0mK.T5D1huxlBqG4.N1x5cZfK5k5bL1U/2x2y2y2y', 'Yogesh Admin', 'Super Admin'),
('manager', '$2a$10$9F00hPq9N8wN0mK.T5D1huxlBqG4.N1x5cZfK5k5bL1U/2x2y2y2y', 'Fleet Manager', 'Manager')
ON CONFLICT (username) DO NOTHING;

-- Seed Financial Accounts (with Custom Details)
INSERT INTO financial_accounts (id, name, type, balance, account_number, ifsc_code, bank_name) VALUES
('ACC-001', 'Cash', 'Cash', 12000, NULL, NULL, 'Cash Drawer'),
('ACC-002', 'SBI Bank', 'Bank', 500000, '30987654321', 'SBIN0001234', 'State Bank of India'),
('ACC-003', 'HDFC Bank', 'Bank', 320000, '5010022334455', 'HDFC0000045', 'HDFC Bank Ltd'),
('ACC-004', 'UPI Wallet', 'Mobile Wallet', 45000, 'yogen@upi', 'UPI', 'Google Pay Wallet'),
('ACC-005', 'Bank Transfer', 'Bank', 250000, '998877665544', 'BARB0POWAI', 'Bank of Baroda')
ON CONFLICT (name) DO NOTHING;

-- Seed Transactions Ledger
INSERT INTO transactions (id, date, type, category, amount, description, reference_id, payment_method) VALUES
('TXN-001', '2026-07-09', 'Income', 'Trip Revenue', 38000, 'Cargo Revenue for TRP-003 delivery', 'TRP-003', 'Bank Transfer'),
('TXN-002', '2026-07-09', 'Expense', 'Toll Cost', 2400, 'Toll taxes paid for TRP-003 shipment', 'TRP-003', 'Cash'),
('TXN-003', '2026-07-09', 'Expense', 'Fuel', 9600, 'Diesel refueling expense for TRP-003', 'TRP-003', 'UPI'),
('TXN-004', '2026-06-15', 'Expense', 'Maintenance', 32000, 'Engine overhaul repair charges for TRK-003', 'MNT-001', 'HDFC Bank'),
('TXN-005', '2026-07-10', 'Expense', 'Maintenance', 12500, 'Brake alignment workshop charges for TRK-001', 'MNT-002', 'SBI Bank'),
('TXN-006', '2026-07-01', 'Expense', 'Salary', 45000, 'Monthly operator salaries payout - Rajesh Kumar', NULL, 'HDFC Bank'),
('TXN-007', '2026-07-01', 'Expense', 'Rent', 25000, 'Mumbai logistics hub warehouse monthly rent lease', NULL, 'Bank Transfer')
ON CONFLICT (id) DO NOTHING;

-- Seed Fuel Logs
INSERT INTO fuel_logs (id, truck_id, driver_id, trip_id, date, quantity, price_per_liter, total_cost, odometer, payment_method, reference_id) VALUES
('FUL-001', 'TRK-001', 'DRV-001', 'TRP-003', '2026-07-08', 80.0, 95.50, 7640.0, 125400, 'Cash', 'TXN-002'),
('FUL-002', 'TRK-002', 'DRV-002', 'TRP-001', '2026-07-13', 120.0, 96.00, 11520.0, 89350, 'SBI Bank', NULL)
ON CONFLICT (id) DO NOTHING;
