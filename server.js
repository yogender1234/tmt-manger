const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'transroute-super-secure-key-998877';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const MOCK_MODE = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder');

if (MOCK_MODE) {
  console.log("=================================================================");
  console.log("INFO: Running in DEMO MODE with in-memory data (no Supabase).");
  console.log("      Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to use DB.");
  console.log("=================================================================");
}

const supabase = MOCK_MODE ? null : createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(cookieParser());

// -----------------------------------------------------------------------------
// IN-MEMORY MOCK DATA STORE
// -----------------------------------------------------------------------------
const mockDB = {
  trucks: [
    { id: 'TRK-001', plate: 'MH-12-AB-1234', model: 'Tata Prima 4028.S', capacity: 28, status: 'Idle', driver_id: 'DRV-001', location: 'Chennai', fuel_type: 'Diesel', last_service: '2026-05-20' },
    { id: 'TRK-002', plate: 'DL-07-CX-9876', model: 'Ashok Leyland 3518', capacity: 20, status: 'On Route', driver_id: 'DRV-002', location: 'Kolkata', fuel_type: 'Diesel', last_service: '2026-04-10' },
    { id: 'TRK-003', plate: 'GJ-01-ZZ-4567', model: 'BharatBenz 3523R', capacity: 22, status: 'Maintenance', driver_id: null, location: 'Ahmedabad', fuel_type: 'CNG', last_service: '2026-06-15' },
    { id: 'TRK-004', plate: 'RJ-14-DC-3210', model: 'Eicher Pro 6028', capacity: 16, status: 'On Route', driver_id: 'DRV-004', location: 'Jaipur', fuel_type: 'Diesel', last_service: '2026-03-01' },
    { id: 'TRK-005', plate: 'KA-09-MR-7654', model: 'Mahindra Furio 17', capacity: 17, status: 'On Route', driver_id: 'DRV-005', location: 'Ahmedabad', fuel_type: 'Diesel', last_service: '2026-06-01' },
    { id: 'TRK-006', plate: 'TN-22-PQ-5511', model: 'Tata Ultra 1518', capacity: 12, status: 'Idle', driver_id: null, location: 'Chennai', fuel_type: 'Diesel', last_service: '2026-05-05' },
  ],
  drivers: [
    { id: 'DRV-001', name: 'Rajesh Kumar', phone: '9876543210', license: 'MH1234567890', status: 'On Duty', truck_id: 'TRK-001', rating: 4.8, trips_completed: 142, license_expiry: '2027-08-15' },
    { id: 'DRV-002', name: 'Suresh Yadav', phone: '9871234560', license: 'DL0987654321', status: 'On Duty', truck_id: 'TRK-002', rating: 4.5, trips_completed: 98, license_expiry: '2026-11-30' },
    { id: 'DRV-003', name: 'Amit Singh', phone: '9765432109', license: 'GJ5678901234', status: 'Available', truck_id: null, rating: 4.2, trips_completed: 67, license_expiry: '2025-12-01' },
    { id: 'DRV-004', name: 'Vikram Sharma', phone: '9832145670', license: 'RJ2345678901', status: 'On Duty', truck_id: 'TRK-004', rating: 4.9, trips_completed: 215, license_expiry: '2028-03-20' },
    { id: 'DRV-005', name: 'Ravi Nair', phone: '9944332211', license: 'KA9876543201', status: 'Available', truck_id: 'TRK-005', rating: 4.6, trips_completed: 88, license_expiry: '2027-07-10' },
    { id: 'DRV-006', name: 'Karthik Raj', phone: '9600112233', license: 'TN1122334455', status: 'Available', truck_id: null, rating: 4.7, trips_completed: 55, license_expiry: '2027-12-31' },
  ],
  trips: [
    // BUG-06 FIX: expense removed from seed — live aggregation in /api/db computes it dynamically
    { id: 'TRP-001', route_id: null, truck_id: 'TRK-002', driver_id: 'DRV-002', source: 'Mumbai', destination: 'Kolkata', distance: 2050, toll_cost: 14500, return_source: null, return_destination: null, return_distance: 0, return_toll_cost: 0, status: 'In Transit', start_date: '2026-07-13', end_date: '2026-07-17', progress: 40, revenue: 92250, expense: 0 },
    { id: 'TRP-002', route_id: null, truck_id: 'TRK-004', driver_id: 'DRV-004', source: 'Delhi', destination: 'Jaipur', distance: 270, toll_cost: 1800, return_source: 'Jaipur', return_destination: 'Delhi', return_distance: 270, return_toll_cost: 1800, status: 'In Transit', start_date: '2026-07-15', end_date: '2026-07-16', progress: 60, revenue: 24300, expense: 0 },
    { id: 'TRP-003', route_id: null, truck_id: 'TRK-001', driver_id: 'DRV-001', source: 'Bengaluru', destination: 'Chennai', distance: 350, toll_cost: 2400, return_source: 'Chennai', return_destination: 'Bengaluru', return_distance: 350, return_toll_cost: 2400, status: 'Delivered', start_date: '2026-07-08', end_date: '2026-07-09', progress: 100, revenue: 31500, expense: 0 },
    { id: 'TRP-004', route_id: null, truck_id: 'TRK-005', driver_id: 'DRV-005', source: 'Ahmedabad', destination: 'Mumbai', distance: 530, toll_cost: 3500, return_source: null, return_destination: null, return_distance: 0, return_toll_cost: 0, status: 'In Transit', start_date: '2026-07-18', end_date: '2026-07-19', progress: 20, revenue: 23850, expense: 0 },
    { id: 'TRP-005', route_id: null, truck_id: 'TRK-006', driver_id: 'DRV-006', source: 'Chennai', destination: 'Bengaluru', distance: 350, toll_cost: 2200, return_source: 'Bengaluru', return_destination: 'Chennai', return_distance: 350, return_toll_cost: 2200, status: 'Delivered', start_date: '2026-07-05', end_date: '2026-07-06', progress: 100, revenue: 31500, expense: 0 },
  ],
  maintenance: [
    { id: 'MNT-001', truck_id: 'TRK-003', date: '2026-06-15', type: 'Engine Overhaul & Oil Filter Replacement', cost: 32000, status: 'Completed' },
    { id: 'MNT-002', truck_id: 'TRK-001', date: '2026-07-10', type: 'Brake pad replacement & wheel alignment', cost: 12500, status: 'Completed' },
    { id: 'MNT-003', truck_id: 'TRK-003', date: '2026-07-15', type: 'Gear box inspection & coolant flush', cost: 18000, status: 'In Progress' },
    { id: 'MNT-004', truck_id: 'TRK-006', date: '2026-07-12', type: 'Full chassis lubrication & tyre rotation', cost: 6500, status: 'Completed' },
  ],
  routes: [
    { id: 'RTE-001', name: 'Mumbai-Delhi Express', source: 'Mumbai', destination: 'Delhi', distance: 1400, toll_cost: 9800, est_days: 2 },
    { id: 'RTE-002', name: 'Bengaluru-Chennai Corridor', source: 'Bengaluru', destination: 'Chennai', distance: 350, toll_cost: 2400, est_days: 1 },
    { id: 'RTE-003', name: 'Mumbai-Kolkata National Highway', source: 'Mumbai', destination: 'Kolkata', distance: 2050, toll_cost: 14500, est_days: 3 },
    { id: 'RTE-004', name: 'Delhi-Jaipur Rajasthan Route', source: 'Delhi', destination: 'Jaipur', distance: 270, toll_cost: 1800, est_days: 1 },
  ],
  // BUG-01 FIX: TXN-003 removed — it was a duplicate of FUL-001's fuel cost, causing double-counting on TRP-003
  transactions: [
    { id: 'TXN-001', date: '2026-07-09', type: 'Income', category: 'Trip Revenue', amount: 31500, description: 'Cargo Revenue for TRP-003 delivery (Bengaluru-Chennai)', reference_id: 'TRP-003', payment_method: 'SBI Bank' },
    { id: 'TXN-002', date: '2026-07-09', type: 'Expense', category: 'Toll Cost', amount: 2400, description: 'Toll taxes paid for TRP-003 (Bengaluru-Chennai)', reference_id: 'TRP-003', payment_method: 'Cash' },
    { id: 'TXN-003', date: '2026-06-15', type: 'Expense', category: 'Maintenance', amount: 32000, description: 'Engine overhaul repair charges for TRK-003', reference_id: 'MNT-001', payment_method: 'Bank Transfer' },
    { id: 'TXN-004', date: '2026-07-10', type: 'Expense', category: 'Maintenance', amount: 12500, description: 'Brake alignment workshop charges for TRK-001', reference_id: 'MNT-002', payment_method: 'SBI Bank' },
    { id: 'TXN-005', date: '2026-07-01', type: 'Expense', category: 'Salary', amount: 45000, description: 'Monthly operator salaries payout - All Drivers July 2026', reference_id: null, payment_method: 'HDFC Bank' },
    { id: 'TXN-006', date: '2026-07-01', type: 'Expense', category: 'Rent', amount: 25000, description: 'Mumbai logistics hub warehouse monthly rent lease', reference_id: null, payment_method: 'Bank Transfer' },
    { id: 'TXN-007', date: '2026-07-06', type: 'Income', category: 'Trip Revenue', amount: 31500, description: 'Cargo Revenue for TRP-005 delivery (Chennai-Bengaluru)', reference_id: 'TRP-005', payment_method: 'SBI Bank' },
    { id: 'TXN-008', date: '2026-07-06', type: 'Expense', category: 'Toll Cost', amount: 2200, description: 'Toll taxes paid for TRP-005 (Chennai-Bengaluru)', reference_id: 'TRP-005', payment_method: 'Cash' },
    { id: 'TXN-009', date: '2026-07-12', type: 'Expense', category: 'Maintenance', amount: 6500, description: 'Tyre rotation & lubrication for TRK-006', reference_id: 'MNT-004', payment_method: 'Cash' },
    { id: 'TXN-010', date: '2026-07-05', type: 'Expense', category: 'Insurance', amount: 35000, description: 'Annual fleet insurance premium renewal', reference_id: null, payment_method: 'Bank Transfer' },
    { id: 'TXN-011', date: '2026-07-08', type: 'Expense', category: 'Fuel', amount: 7640, description: 'Fuel refill: 80L @ ₹95.50/L for TRK-001', reference_id: 'FUL-001', payment_method: 'Cash' },
    { id: 'TXN-012', date: '2026-07-13', type: 'Expense', category: 'Fuel', amount: 11520, description: 'Fuel refill: 120L @ ₹96.00/L for TRK-002', reference_id: 'FUL-002', payment_method: 'SBI Bank' },
    { id: 'TXN-013', date: '2026-07-15', type: 'Expense', category: 'Fuel', amount: 5748, description: 'Fuel refill: 60L @ ₹95.80/L for TRK-004', reference_id: 'FUL-003', payment_method: 'HDFC Bank' },
    { id: 'TXN-014', date: '2026-07-18', type: 'Expense', category: 'Fuel', amount: 8595, description: 'Fuel refill: 90L @ ₹95.50/L for TRK-005', reference_id: 'FUL-004', payment_method: 'UPI Wallet' },
    { id: 'TXN-015', date: '2026-07-08', type: 'Expense', category: 'Other', amount: 550, description: 'DEF refill: 10L @ ₹55.00/L for TRK-001', reference_id: 'DEF-001', payment_method: 'Cash' },
    { id: 'TXN-016', date: '2026-07-13', type: 'Expense', category: 'Other', amount: 840, description: 'DEF refill: 15L @ ₹56.00/L for TRK-002', reference_id: 'DEF-002', payment_method: 'SBI Bank' },
    { id: 'TXN-017', date: '2026-07-15', type: 'Expense', category: 'Other', amount: 444, description: 'DEF refill: 8L @ ₹55.50/L for TRK-004', reference_id: 'DEF-003', payment_method: 'Cash' },
  ],
  financial_accounts: [
    { id: 'ACC-001', name: 'Cash', type: 'Cash', balance: 38500, account_number: null, ifsc_code: null, bank_name: 'Cash Drawer' },
    { id: 'ACC-002', name: 'SBI Bank', type: 'Bank', balance: 625000, account_number: '30987654321', ifsc_code: 'SBIN0001234', bank_name: 'State Bank of India' },
    { id: 'ACC-003', name: 'HDFC Bank', type: 'Bank', balance: 410000, account_number: '5010022334455', ifsc_code: 'HDFC0000045', bank_name: 'HDFC Bank Ltd' },
    { id: 'ACC-004', name: 'UPI Wallet', type: 'Mobile Wallet', balance: 52000, account_number: 'transroute@upi', ifsc_code: 'UPI', bank_name: 'Google Pay Wallet' },
    { id: 'ACC-005', name: 'Bank Transfer', type: 'Bank', balance: 285000, account_number: '998877665544', ifsc_code: 'BARB0POWAI', bank_name: 'Bank of Baroda' },
  ],
  // BUG-09 FIX: FUL-001 reference_id set to null (it was incorrectly pointing to TXN-003)
  // BUG-01 FIX: FUL-001 no longer references TXN-003 — its cost is aggregated directly in /api/db
  fuel_logs: [
    { id: 'FUL-001', truck_id: 'TRK-001', driver_id: 'DRV-001', trip_id: 'TRP-003', date: '2026-07-08', quantity: 80, price_per_liter: 95.50, total_cost: 7640, odometer: 125400, payment_method: 'Cash', reference_id: null },
    { id: 'FUL-002', truck_id: 'TRK-002', driver_id: 'DRV-002', trip_id: 'TRP-001', date: '2026-07-13', quantity: 120, price_per_liter: 96.00, total_cost: 11520, odometer: 89350, payment_method: 'SBI Bank', reference_id: null },
    { id: 'FUL-003', truck_id: 'TRK-004', driver_id: 'DRV-004', trip_id: 'TRP-002', date: '2026-07-15', quantity: 60, price_per_liter: 95.80, total_cost: 5748, odometer: 67200, payment_method: 'HDFC Bank', reference_id: null },
    { id: 'FUL-004', truck_id: 'TRK-005', driver_id: 'DRV-005', trip_id: 'TRP-004', date: '2026-07-18', quantity: 90, price_per_liter: 95.50, total_cost: 8595, odometer: 43600, payment_method: 'UPI Wallet', reference_id: null },
  ],
  def_logs: [
    { id: 'DEF-001', truck_id: 'TRK-001', driver_id: 'DRV-001', trip_id: 'TRP-003', date: '2026-07-08', quantity: 10, price_per_liter: 55.00, total_cost: 550, odometer: 125400, payment_method: 'Cash', reference_id: null },
    { id: 'DEF-002', truck_id: 'TRK-002', driver_id: 'DRV-002', trip_id: 'TRP-001', date: '2026-07-13', quantity: 15, price_per_liter: 56.00, total_cost: 840, odometer: 89350, payment_method: 'SBI Bank', reference_id: null },
    { id: 'DEF-003', truck_id: 'TRK-004', driver_id: 'DRV-004', trip_id: 'TRP-002', date: '2026-07-15', quantity: 8, price_per_liter: 55.50, total_cost: 444, odometer: 67200, payment_method: 'Cash', reference_id: null },
  ],
  users: [
    { id: 1, username: 'admin', password: '$2a$10$9F00hPq9N8wN0mK.T5D1huxlBqG4.N1x5cZfK5k5bL1U/2x2y2y2y', name: 'Yogesh Admin', role: 'Super Admin' },
    { id: 2, username: 'manager', password: '$2a$10$9F00hPq9N8wN0mK.T5D1huxlBqG4.N1x5cZfK5k5bL1U/2x2y2y2y', name: 'Fleet Manager', role: 'Manager' },
  ],
  categories: [
    { id: 'CAT-001', name: 'Trip Revenue', type: 'Income' },
    { id: 'CAT-002', name: 'Toll Cost', type: 'Expense' },
    { id: 'CAT-003', name: 'Fuel', type: 'Expense' },
    { id: 'CAT-004', name: 'Maintenance', type: 'Expense' },
    { id: 'CAT-005', name: 'Salary', type: 'Expense' },
    { id: 'CAT-006', name: 'Rent', type: 'Expense' },
    { id: 'CAT-007', name: 'Insurance', type: 'Expense' },
    { id: 'CAT-008', name: 'Driver Allowance', type: 'Expense' },
    { id: 'CAT-009', name: 'Repairs & Workshop', type: 'Expense' },
    { id: 'CAT-010', name: 'Loading/Unloading', type: 'Expense' },
    { id: 'CAT-011', name: 'Food & Lodging', type: 'Expense' },
    { id: 'CAT-012', name: 'Other', type: 'Expense' },
    { id: 'CAT-013', name: 'Others', type: 'Expense' }
  ]
};

// BUG-05 FIX: genId uses max-counter to avoid duplicates after delete→add cycles
function genId(prefix, arr) {
  if (arr.length === 0) return `${prefix}-001`;
  const nums = arr.map(r => {
    const parts = String(r.id).split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  });
  return `${prefix}-${String(Math.max(...nums) + 1).padStart(3, '0')}`;
}

// -----------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -----------------------------------------------------------------------------
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    if (req.accepts('html') && !req.xhr) return res.redirect('/login.html');
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.clearCookie('token');
      if (req.accepts('html') && !req.xhr) return res.redirect('/login.html');
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'Super Admin' || req.user.role === 'Manager')) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
}

// -----------------------------------------------------------------------------
// PUBLIC STATIC ROUTES & AUTH API
// -----------------------------------------------------------------------------
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'style.css')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password are required." });
  try {
    if (MOCK_MODE) {
      const user = mockDB.users.find(u => u.username === username);
      const passwordOk = (username === 'admin' && password === 'admin123') ||
                         (username === 'manager' && password === 'admin123') ||
                         (user && await bcrypt.compare(password, user.password).catch(() => false));
      if (!user || !passwordOk) return res.status(401).json({ error: "Invalid credentials." });
      const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 12 * 60 * 60 * 1000 });
      return res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    }
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !user) return res.status(401).json({ error: "Incorrect username or password." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect username or password." });
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 12 * 60 * 60 * 1000 });
    res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server authentication failure." });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: "Logged out successfully" });
});

app.use(authenticateJWT);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/auth/me', (req, res) => res.json({ user: req.user }));

// -----------------------------------------------------------------------------
// MAPPING HELPERS
// -----------------------------------------------------------------------------
const mapTruckToJS = db => !db ? null : ({ id: db.id, plate: db.plate, model: db.model, capacity: db.capacity, status: db.status, driverId: db.driver_id, location: db.location, fuelType: db.fuel_type, lastService: db.last_service });
const mapTruckToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.plate !== undefined) d.plate=js.plate; if (js.model !== undefined) d.model=js.model; if (js.capacity !== undefined) d.capacity=js.capacity; if (js.status !== undefined) d.status=js.status; if (js.driverId !== undefined) d.driver_id=js.driverId; if (js.location !== undefined) d.location=js.location; if (js.fuelType !== undefined) d.fuel_type=js.fuelType; if (js.lastService !== undefined) d.last_service=js.lastService; return d; };

const mapDriverToJS = db => !db ? null : ({ id: db.id, name: db.name, phone: db.phone, license: db.license, status: db.status, truckId: db.truck_id, rating: Number(db.rating)||5.0, tripsCompleted: db.trips_completed||0, licenseExpiry: db.license_expiry });
const mapDriverToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.name !== undefined) d.name=js.name; if (js.phone !== undefined) d.phone=js.phone; if (js.license !== undefined) d.license=js.license; if (js.status !== undefined) d.status=js.status; if (js.truckId !== undefined) d.truck_id=js.truckId; if (js.rating !== undefined) d.rating=js.rating; if (js.tripsCompleted !== undefined) d.trips_completed=js.tripsCompleted; if (js.licenseExpiry !== undefined) d.license_expiry=js.licenseExpiry; return d; };

const mapTripToJS = db => !db ? null : ({ id: db.id, truckId: db.truck_id, driverId: db.driver_id, routeId: db.route_id, source: db.source, destination: db.destination, distance: Number(db.distance)||0, tollCost: Number(db.toll_cost)||0, returnSource: db.return_source, returnDestination: db.return_destination, returnDistance: Number(db.return_distance)||0, returnTollCost: Number(db.return_toll_cost)||0, status: db.status, startDate: db.start_date, endDate: db.end_date, progress: db.progress||0, revenue: db.revenue||0, expense: db.expense||0 });
const mapTripToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.truckId !== undefined) d.truck_id=js.truckId; if (js.driverId !== undefined) d.driver_id=js.driverId; if (js.routeId !== undefined) d.route_id=js.routeId; if (js.source !== undefined) d.source=js.source; if (js.destination !== undefined) d.destination=js.destination; if (js.distance !== undefined) d.distance=js.distance; if (js.tollCost !== undefined) d.toll_cost=js.tollCost; if (js.returnSource !== undefined) d.return_source=js.returnSource; if (js.returnDestination !== undefined) d.return_destination=js.returnDestination; if (js.returnDistance !== undefined) d.return_distance=js.returnDistance; if (js.returnTollCost !== undefined) d.return_toll_cost=js.returnTollCost; if (js.status !== undefined) d.status=js.status; if (js.startDate !== undefined) d.start_date=js.startDate; if (js.endDate !== undefined) d.end_date=js.endDate; if (js.progress !== undefined) d.progress=js.progress; if (js.revenue !== undefined) d.revenue=js.revenue; if (js.expense !== undefined) d.expense=js.expense; return d; };

const mapMaintenanceToJS = db => !db ? null : ({ id: db.id, truckId: db.truck_id, date: db.date, type: db.type, cost: db.cost||0, status: db.status });
const mapMaintenanceToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.truckId !== undefined) d.truck_id=js.truckId; if (js.date !== undefined) d.date=js.date; if (js.type !== undefined) d.type=js.type; if (js.cost !== undefined) d.cost=js.cost; if (js.status !== undefined) d.status=js.status; return d; };

const mapRouteToJS = db => !db ? null : ({ id: db.id, name: db.name, source: db.source, destination: db.destination, distance: db.distance, tollCost: db.toll_cost, estDays: db.est_days });
const mapRouteToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.name !== undefined) d.name=js.name; if (js.source !== undefined) d.source=js.source; if (js.destination !== undefined) d.destination=js.destination; if (js.distance !== undefined) d.distance=js.distance; if (js.tollCost !== undefined) d.toll_cost=js.tollCost; if (js.estDays !== undefined) d.est_days=js.estDays; return d; };

const mapTransactionToJS = db => !db ? null : ({ id: db.id, date: db.date, type: db.type, category: db.category, amount: Number(db.amount)||0, description: db.description, referenceId: db.reference_id, paymentMethod: db.payment_method||'Cash' });
const mapTransactionToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.date !== undefined) d.date=js.date; if (js.type !== undefined) d.type=js.type; if (js.category !== undefined) d.category=js.category; if (js.amount !== undefined) d.amount=js.amount; if (js.description !== undefined) d.description=js.description; if (js.referenceId !== undefined) d.reference_id=js.referenceId; if (js.paymentMethod !== undefined) d.payment_method=js.paymentMethod; return d; };

const mapFinancialAccountToJS = db => !db ? null : ({ id: db.id, name: db.name, type: db.type, balance: Number(db.balance)||0, accountNumber: db.account_number, ifscCode: db.ifsc_code, bankName: db.bank_name });
const mapFinancialAccountToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.name !== undefined) d.name=js.name; if (js.type !== undefined) d.type=js.type; if (js.balance !== undefined) d.balance=js.balance; if (js.accountNumber !== undefined) d.account_number=js.accountNumber; if (js.ifscCode !== undefined) d.ifsc_code=js.ifscCode; if (js.bankName !== undefined) d.bank_name=js.bankName; return d; };

const mapFuelLogToJS = db => !db ? null : ({ id: db.id, truckId: db.truck_id, driverId: db.driver_id, tripId: db.trip_id, date: db.date, quantity: Number(db.quantity)||0, pricePerLiter: Number(db.price_per_liter)||0, totalCost: Number(db.total_cost)||0, odometer: Number(db.odometer)||0, paymentMethod: db.payment_method, referenceId: db.reference_id });
const mapFuelLogToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.truckId !== undefined) d.truck_id=js.truckId; if (js.driverId !== undefined) d.driver_id=js.driverId; if (js.tripId !== undefined) d.trip_id=js.tripId; if (js.date !== undefined) d.date=js.date; if (js.quantity !== undefined) d.quantity=js.quantity; if (js.pricePerLiter !== undefined) d.price_per_liter=js.pricePerLiter; if (js.totalCost !== undefined) d.total_cost=js.totalCost; if (js.odometer !== undefined) d.odometer=js.odometer; if (js.paymentMethod !== undefined) d.payment_method=js.paymentMethod; if (js.referenceId !== undefined) d.reference_id=js.referenceId; return d; };

const mapDefLogToJS = db => !db ? null : ({ id: db.id, truckId: db.truck_id, driverId: db.driver_id, tripId: db.trip_id, date: db.date, quantity: Number(db.quantity)||0, pricePerLiter: Number(db.price_per_liter)||0, totalCost: Number(db.total_cost)||0, odometer: Number(db.odometer)||0, paymentMethod: db.payment_method, referenceId: db.reference_id });
const mapDefLogToDB = js => { if (!js) return null; const d = {}; if (js.id !== undefined) d.id=js.id; if (js.truckId !== undefined) d.truck_id=js.truckId; if (js.driverId !== undefined) d.driver_id=js.driverId; if (js.tripId !== undefined) d.trip_id=js.tripId; if (js.date !== undefined) d.date=js.date; if (js.quantity !== undefined) d.quantity=js.quantity; if (js.pricePerLiter !== undefined) d.price_per_liter=js.pricePerLiter; if (js.totalCost !== undefined) d.total_cost=js.totalCost; if (js.odometer !== undefined) d.odometer=js.odometer; if (js.paymentMethod !== undefined) d.payment_method=js.paymentMethod; if (js.referenceId !== undefined) d.reference_id=js.referenceId; return d; };

// Mock DB helpers
function mockFind(table, id) { return mockDB[table].find(r => r.id === id || r.id === Number(id)); }
function mockFindIndex(table, id) { return mockDB[table].findIndex(r => r.id === id || r.id === Number(id)); }
function mockBalance(accountName, delta) {
  const acc = mockDB.financial_accounts.find(a => a.name === accountName);
  if (acc) acc.balance = (Number(acc.balance) || 0) + delta;
}

// -----------------------------------------------------------------------------
// USER MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/users', requireAdmin, async (req, res) => {
  if (MOCK_MODE) return res.json(mockDB.users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role })));
  try {
    const { data, error } = await supabase.from('users').select('id, username, name, role').order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) return res.status(400).json({ error: "All fields are required." });
  if (MOCK_MODE) {
    const newId = mockDB.users.length + 1;
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: newId, username, password: hashed, name, role };
    mockDB.users.push(user);
    return res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ username, password: hashedPassword, name, role }]).select('id, username, name, role');
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('users', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    mockDB.users.splice(idx, 1);
    return res.json({ message: "User deleted." });
  }
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "User account deleted successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// CATEGORIES API
// -----------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  if (MOCK_MODE) return res.json(mockDB.categories);
  try {
    const { data, error } = await supabase.from('categories').select('*').order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.json(mockDB.categories); // fallback
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Name and type are required." });
  if (MOCK_MODE) {
    const newId = genId('CAT', mockDB.categories);
    const category = { id: newId, name, type };
    mockDB.categories.push(category);
    return res.status(201).json(category);
  }
  try {
    const newId = 'CAT-' + Math.random().toString(36).substr(2,9).toUpperCase();
    const { data, error } = await supabase.from('categories').insert([{ id: newId, name, type }]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    const newId = genId('CAT', mockDB.categories);
    const category = { id: newId, name, type };
    mockDB.categories.push(category);
    res.status(201).json(category);
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  const catId = req.params.id;
  const { name, type } = req.body;
  if (MOCK_MODE) {
    const idx = mockFindIndex('categories', catId);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });
    Object.assign(mockDB.categories[idx], { name: name || mockDB.categories[idx].name, type: type || mockDB.categories[idx].type });
    return res.json(mockDB.categories[idx]);
  }
  try {
    const { data, error } = await supabase.from('categories').update({ name, type }).eq('id', catId).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    const idx = mockFindIndex('categories', catId);
    if (idx !== -1) {
      Object.assign(mockDB.categories[idx], { name: name || mockDB.categories[idx].name, type: type || mockDB.categories[idx].type });
      return res.json(mockDB.categories[idx]);
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  const catId = req.params.id;
  if (MOCK_MODE) {
    const idx = mockFindIndex('categories', catId);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });
    mockDB.categories.splice(idx, 1);
    return res.json({ message: "Category deleted." });
  }
  try {
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) throw error;
    res.json({ message: "Category deleted successfully." });
  } catch (err) {
    const idx = mockFindIndex('categories', catId);
    if (idx !== -1) {
      mockDB.categories.splice(idx, 1);
      return res.json({ message: "Category deleted." });
    }
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 1. GET ALL DATA
// -----------------------------------------------------------------------------
app.get('/api/db', async (req, res) => {
  try {
    let trucks, drivers, trips, maintenance, routes, transactions, financialAccounts, fuelLogs, defLogs, categories;

    if (MOCK_MODE) {
      trucks = mockDB.trucks.map(mapTruckToJS);
      drivers = mockDB.drivers.map(mapDriverToJS);
      transactions = mockDB.transactions.map(mapTransactionToJS);
      fuelLogs = mockDB.fuel_logs.map(mapFuelLogToJS);
      defLogs = mockDB.def_logs.map(mapDefLogToJS);
      maintenance = mockDB.maintenance.map(mapMaintenanceToJS);
      routes = mockDB.routes.map(mapRouteToJS);
      financialAccounts = mockDB.financial_accounts.map(mapFinancialAccountToJS);
      categories = mockDB.categories;

      // Dynamic trip expense aggregation
      trips = mockDB.trips.map(mapTripToJS).map(trip => {
        const tripTxnExpenses = transactions.filter(t => t.referenceId === trip.id && t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
        const tripFuelExpenses = fuelLogs.filter(f => f.tripId === trip.id).reduce((s, f) => s + f.totalCost, 0);
        const tripDefExpenses = defLogs.filter(d => d.tripId === trip.id).reduce((s, d) => s + d.totalCost, 0);
        trip.expense = tripTxnExpenses + tripFuelExpenses + tripDefExpenses;
        return trip;
      });
    } else {
      const [r1,r2,r3,r4,r5,r6,r7,r8,r9] = await Promise.all([
        supabase.from('trucks').select('*').order('id'),
        supabase.from('drivers').select('*').order('id'),
        supabase.from('trips').select('*').order('id'),
        supabase.from('maintenance').select('*').order('id'),
        supabase.from('routes').select('*').order('id'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('financial_accounts').select('*').order('id'),
        supabase.from('fuel_logs').select('*').order('date', { ascending: false }),
        supabase.from('def_logs').select('*').order('date', { ascending: false }),
      ]);
      if (r1.error||r2.error||r3.error||r4.error||r5.error||r6.error||r7.error||r8.error||r9.error) throw new Error('DB fetch error');
      trucks = (r1.data||[]).map(mapTruckToJS);
      drivers = (r2.data||[]).map(mapDriverToJS);
      maintenance = (r4.data||[]).map(mapMaintenanceToJS);
      routes = (r5.data||[]).map(mapRouteToJS);
      transactions = (r6.data||[]).map(mapTransactionToJS);
      financialAccounts = (r7.data||[]).map(mapFinancialAccountToJS);
      fuelLogs = (r8.data||[]).map(mapFuelLogToJS);
      defLogs = (r9.data||[]).map(mapDefLogToJS);
      trips = (r3.data||[]).map(mapTripToJS).map(trip => {
        const txnExp = transactions.filter(t => t.referenceId === trip.id && t.type === 'Expense').reduce((s,t) => s+t.amount, 0);
        const fuelExp = fuelLogs.filter(f => f.tripId === trip.id).reduce((s,f) => s+f.totalCost, 0);
        const defExp = defLogs.filter(d => d.tripId === trip.id).reduce((s,d) => s+d.totalCost, 0);
        trip.expense = txnExp + fuelExp + defExp;
        return trip;
      });

      try {
        const { data: catData, error: catErr } = await supabase.from('categories').select('*').order('id');
        if (catErr) throw catErr;
        categories = catData || [];
      } catch (catErrEx) {
        categories = mockDB.categories;
      }
    }

    res.json({ trucks, drivers, trips, maintenance, routes, transactions, financialAccounts, fuelLogs, defLogs, categories });
  } catch (err) {
    console.error("Database Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch data. Make sure Supabase schema is applied or use Demo Mode." });
  }
});

// -----------------------------------------------------------------------------
// 2. TRUCKS API
// -----------------------------------------------------------------------------
app.post('/api/trucks', async (req, res) => {
  if (MOCK_MODE) {
    const newId = genId('TRK', mockDB.trucks);
    const truck = { id: newId, plate: req.body.plate, model: req.body.model, capacity: req.body.capacity||0, status: req.body.status||'Idle', driver_id: req.body.driverId||null, location: req.body.location||'Depot', fuel_type: req.body.fuelType||'Diesel', last_service: req.body.lastService||null };
    mockDB.trucks.push(truck);
    if (truck.driver_id) { const d = mockFind('drivers', truck.driver_id); if (d) { d.truck_id = newId; d.status = truck.status === 'On Route' ? 'On Duty' : 'Available'; } }
    return res.status(201).json(mapTruckToJS(truck));
  }
  try {
    const { data: list } = await supabase.from('trucks').select('id');
    const newId = `TRK-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapTruckToDB({ id: newId, plate: req.body.plate, model: req.body.model, capacity: req.body.capacity, status: req.body.status||'Idle', driverId: req.body.driverId||null, location: req.body.location, fuelType: req.body.fuelType, lastService: req.body.lastService });
    const { data, error } = await supabase.from('trucks').insert([payload]).select();
    if (error) throw error;
    if (payload.driver_id) await supabase.from('drivers').update({ truck_id: newId, status: payload.status==='On Route'?'On Duty':'Available' }).eq('id', payload.driver_id);
    res.status(201).json(mapTruckToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/trucks/:id', async (req, res) => {
  const truckId = req.params.id;
  if (MOCK_MODE) {
    const idx = mockFindIndex('trucks', truckId);
    if (idx === -1) return res.status(404).json({ error: "Truck not found" });
    const old = mockDB.trucks[idx];
    if (old.driver_id && old.driver_id !== req.body.driverId) { const d = mockFind('drivers', old.driver_id); if (d) { d.truck_id = null; d.status = 'Available'; } }
    Object.assign(mockDB.trucks[idx], { plate: req.body.plate||old.plate, model: req.body.model||old.model, capacity: req.body.capacity||old.capacity, status: req.body.status||old.status, driver_id: req.body.driverId!==undefined?req.body.driverId:old.driver_id, location: req.body.location||old.location, fuel_type: req.body.fuelType||old.fuel_type, last_service: req.body.lastService||old.last_service });
    const updated = mockDB.trucks[idx];
    if (updated.driver_id) { const d = mockFind('drivers', updated.driver_id); if (d) { d.truck_id = truckId; d.status = updated.status==='On Route'?'On Duty':'Available'; } }
    return res.json(mapTruckToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('trucks').select('*').eq('id', truckId);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Truck not found" });
    const oldTruck = oldData[0];
    const payload = mapTruckToDB({ plate: req.body.plate, model: req.body.model, capacity: req.body.capacity, status: req.body.status, driverId: req.body.driverId!==undefined?req.body.driverId:undefined, location: req.body.location, fuelType: req.body.fuelType, lastService: req.body.lastService });
    const { data, error } = await supabase.from('trucks').update(payload).eq('id', truckId).select();
    if (error) throw error;
    if (oldTruck.driver_id && oldTruck.driver_id !== payload.driver_id) await supabase.from('drivers').update({ truck_id: null, status: 'Available' }).eq('id', oldTruck.driver_id);
    if (payload.driver_id) await supabase.from('drivers').update({ truck_id: truckId, status: payload.status==='On Route'?'On Duty':'Available' }).eq('id', payload.driver_id);
    res.json(mapTruckToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/trucks/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('trucks', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Truck not found" });
    const truck = mockDB.trucks[idx];
    if (truck.driver_id) { const d = mockFind('drivers', truck.driver_id); if (d) { d.truck_id = null; d.status = 'Available'; } }
    mockDB.trucks.splice(idx, 1);
    return res.json({ message: 'Truck deleted successfully' });
  }
  try {
    const { data: list } = await supabase.from('trucks').select('*').eq('id', req.params.id);
    if (list&&list.length>0&&list[0].driver_id) await supabase.from('drivers').update({ truck_id: null, status: 'Available' }).eq('id', list[0].driver_id);
    const { error } = await supabase.from('trucks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Truck deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 3. DRIVERS API
// -----------------------------------------------------------------------------
app.post('/api/drivers', async (req, res) => {
  if (MOCK_MODE) {
    const newId = genId('DRV', mockDB.drivers);
    const driver = { id: newId, name: req.body.name, phone: req.body.phone, license: req.body.license, status: 'Available', truck_id: req.body.truckId||null, rating: req.body.rating||5.0, trips_completed: 0, license_expiry: req.body.licenseExpiry||null };
    mockDB.drivers.push(driver);
    if (driver.truck_id) { const t = mockFind('trucks', driver.truck_id); if (t) t.driver_id = newId; }
    return res.status(201).json(mapDriverToJS(driver));
  }
  try {
    const { data: list } = await supabase.from('drivers').select('id');
    const newId = `DRV-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapDriverToDB({ id: newId, name: req.body.name, phone: req.body.phone, license: req.body.license, status: 'Available', truckId: req.body.truckId||null, rating: req.body.rating||5.0, tripsCompleted: 0, licenseExpiry: req.body.licenseExpiry||null });
    const { data, error } = await supabase.from('drivers').insert([payload]).select();
    if (error) throw error;
    if (payload.truck_id) await supabase.from('trucks').update({ driver_id: newId }).eq('id', payload.truck_id);
    res.status(201).json(mapDriverToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/drivers/:id', async (req, res) => {
  const driverId = req.params.id;
  if (MOCK_MODE) {
    const idx = mockFindIndex('drivers', driverId);
    if (idx === -1) return res.status(404).json({ error: "Driver not found" });
    const old = mockDB.drivers[idx];
    if (old.truck_id && old.truck_id !== req.body.truckId) { const t = mockFind('trucks', old.truck_id); if (t) t.driver_id = null; }
    Object.assign(mockDB.drivers[idx], { name: req.body.name||old.name, phone: req.body.phone||old.phone, license: req.body.license||old.license, license_expiry: req.body.licenseExpiry||old.license_expiry, status: req.body.status||old.status, truck_id: req.body.truckId!==undefined?req.body.truckId:old.truck_id });
    const updated = mockDB.drivers[idx];
    if (updated.truck_id) { const t = mockFind('trucks', updated.truck_id); if (t) t.driver_id = driverId; }
    return res.json(mapDriverToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('drivers').select('*').eq('id', driverId);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Driver not found" });
    const payload = mapDriverToDB({ name: req.body.name, phone: req.body.phone, license: req.body.license, licenseExpiry: req.body.licenseExpiry, status: req.body.status, truckId: req.body.truckId });
    const { data, error } = await supabase.from('drivers').update(payload).eq('id', driverId).select();
    if (error) throw error;
    res.json(mapDriverToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/drivers/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('drivers', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Driver not found" });
    const driver = mockDB.drivers[idx];
    if (driver.truck_id) { const t = mockFind('trucks', driver.truck_id); if (t) t.driver_id = null; }
    mockDB.drivers.splice(idx, 1);
    return res.json({ message: 'Driver deleted successfully' });
  }
  try {
    const { data: list } = await supabase.from('drivers').select('*').eq('id', req.params.id);
    if (list&&list.length>0&&list[0].truck_id) await supabase.from('trucks').update({ driver_id: null }).eq('id', list[0].truck_id);
    const { error } = await supabase.from('drivers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Driver deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 4. TRIPS API
// -----------------------------------------------------------------------------
app.post('/api/trips', async (req, res) => {
  const source = req.body.source;
  const destination = req.body.destination;
  const distance = Number(req.body.distance)||0;
  const tollCost = Number(req.body.tollCost)||0;
  const returnSource = req.body.returnSource||null;
  const returnDestination = req.body.returnDestination||null;
  const returnDistance = req.body.returnDistance!==undefined&&req.body.returnDistance!==''?Number(req.body.returnDistance):0;
  const returnTollCost = req.body.returnTollCost!==undefined&&req.body.returnTollCost!==''?Number(req.body.returnTollCost):0;
  const totalDistance = distance + returnDistance;
  const totalTolls = tollCost + returnTollCost;
  const revenue = Math.round(totalDistance * 45);
  const expense = 0; // Dynamic via aggregation

  if (MOCK_MODE) {
    const newId = genId('TRP', mockDB.trips);
    const trip = { id: newId, route_id: null, truck_id: req.body.truckId||null, driver_id: req.body.driverId||null, source, destination, distance, toll_cost: tollCost, return_source: returnSource, return_destination: returnDestination, return_distance: returnDistance, return_toll_cost: returnTollCost, status: req.body.status||'Pending', start_date: req.body.startDate, end_date: req.body.endDate, progress: req.body.progress||0, revenue, expense };
    mockDB.trips.push(trip);
    if (trip.status === 'In Transit') {
      if (trip.truck_id) { const t = mockFind('trucks', trip.truck_id); if (t) { t.status = 'On Route'; t.driver_id = trip.driver_id; } }
      if (trip.driver_id) { const d = mockFind('drivers', trip.driver_id); if (d) { d.status = 'On Duty'; d.truck_id = trip.truck_id; } }
    }
    return res.status(201).json(mapTripToJS(trip));
  }
  try {
    const { data: list } = await supabase.from('trips').select('id');
    const newId = `TRP-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapTripToDB({ id: newId, truckId: req.body.truckId||null, driverId: req.body.driverId||null, routeId: null, source, destination, distance, tollCost, returnSource, returnDestination, returnDistance, returnTollCost, status: req.body.status||'Pending', startDate: req.body.startDate, endDate: req.body.endDate, progress: req.body.progress||0, revenue, expense });
    const { data, error } = await supabase.from('trips').insert([payload]).select();
    if (error) throw error;
    if (payload.status === 'In Transit') {
      if (payload.truck_id) await supabase.from('trucks').update({ status: 'On Route', driver_id: payload.driver_id }).eq('id', payload.truck_id);
      if (payload.driver_id) await supabase.from('drivers').update({ status: 'On Duty', truck_id: payload.truck_id }).eq('id', payload.driver_id);
    }
    res.status(201).json(mapTripToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/trips/:id', async (req, res) => {
  const tripId = req.params.id;
  if (MOCK_MODE) {
    const idx = mockFindIndex('trips', tripId);
    if (idx === -1) return res.status(404).json({ error: "Trip not found" });
    const old = { ...mockDB.trips[idx] };
    const source = req.body.source!==undefined?req.body.source:old.source;
    const destination = req.body.destination!==undefined?req.body.destination:old.destination;
    const distance = req.body.distance!==undefined?Number(req.body.distance):Number(old.distance);
    const tollCost = req.body.tollCost!==undefined?Number(req.body.tollCost):Number(old.toll_cost);
    const returnSource = req.body.returnSource!==undefined?(req.body.returnSource||null):old.return_source;
    const returnDestination = req.body.returnDestination!==undefined?(req.body.returnDestination||null):old.return_destination;
    const returnDistance = req.body.returnDistance!==undefined?(req.body.returnDistance!==''?Number(req.body.returnDistance):0):Number(old.return_distance||0);
    const returnTollCost = req.body.returnTollCost!==undefined?(req.body.returnTollCost!==''?Number(req.body.returnTollCost):0):Number(old.return_toll_cost||0);
    const totalDistance = distance + returnDistance;
    // BUG-07 FIX: only recalculate revenue when distance/route fields are explicitly sent;
    // status-only updates (Dispatch, Mark Delivered) must NOT overwrite a custom revenue
    const distanceFieldsSent = req.body.distance !== undefined || req.body.source !== undefined || req.body.returnDistance !== undefined;
    const revenue = distanceFieldsSent
      ? (req.body.revenue !== undefined ? Number(req.body.revenue) : Math.round(totalDistance * 45))
      : (old.revenue || Math.round(totalDistance * 45));
    const newStatus = req.body.status||old.status;
    Object.assign(mockDB.trips[idx], { source, destination, distance, toll_cost: tollCost, return_source: returnSource, return_destination: returnDestination, return_distance: returnDistance, return_toll_cost: returnTollCost, status: newStatus, start_date: req.body.startDate||old.start_date, end_date: req.body.endDate||old.end_date, progress: req.body.progress!==undefined?Number(req.body.progress):old.progress, revenue, truck_id: req.body.truckId!==undefined?req.body.truckId:old.truck_id, driver_id: req.body.driverId!==undefined?req.body.driverId:old.driver_id });
    const updated = mockDB.trips[idx];

    if (old.status !== newStatus) {
      if (newStatus === 'In Transit') {
        if (updated.truck_id) { const t = mockFind('trucks', updated.truck_id); if (t) t.status = 'On Route'; }
        if (updated.driver_id) { const d = mockFind('drivers', updated.driver_id); if (d) d.status = 'On Duty'; }
      } else if (newStatus === 'Delivered') {
        updated.progress = 100;
        if (updated.truck_id) { const t = mockFind('trucks', updated.truck_id); if (t) t.status = 'Idle'; }
        if (updated.driver_id) { const d = mockFind('drivers', updated.driver_id); if (d) { d.status = 'Available'; d.trips_completed = (d.trips_completed||0)+1; } }
        // Auto-log income transaction
        const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
        mockDB.transactions.unshift({ id: txnId, date: new Date().toISOString().split('T')[0], type: 'Income', category: 'Trip Revenue', amount: updated.revenue||0, description: `Cargo Revenue: ${updated.id} (${updated.source} → ${updated.destination})`, reference_id: updated.id, payment_method: mockDB.financial_accounts[1]?.name||'SBI Bank' });
        mockBalance(mockDB.financial_accounts[1]?.name||'SBI Bank', updated.revenue||0);
      } else if (newStatus === 'Cancelled') {
        if (updated.truck_id) { const t = mockFind('trucks', updated.truck_id); if (t) t.status = 'Idle'; }
        if (updated.driver_id) { const d = mockFind('drivers', updated.driver_id); if (d) d.status = 'Available'; }
      }
    }
    return res.json(mapTripToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('trips').select('*').eq('id', tripId);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Trip not found" });
    const oldTrip = oldData[0];
    const source = req.body.source!==undefined?req.body.source:oldTrip.source;
    const destination = req.body.destination!==undefined?req.body.destination:oldTrip.destination;
    const distance = req.body.distance!==undefined?Number(req.body.distance):Number(oldTrip.distance);
    const tollCost = req.body.tollCost!==undefined?Number(req.body.tollCost):Number(oldTrip.toll_cost);
    const returnSource = req.body.returnSource!==undefined?(req.body.returnSource||null):oldTrip.return_source;
    const returnDestination = req.body.returnDestination!==undefined?(req.body.returnDestination||null):oldTrip.return_destination;
    const returnDistance = req.body.returnDistance!==undefined?(req.body.returnDistance!==''?Number(req.body.returnDistance):0):Number(oldTrip.return_distance||0);
    const returnTollCost = req.body.returnTollCost!==undefined?(req.body.returnTollCost!==''?Number(req.body.returnTollCost):0):Number(oldTrip.return_toll_cost||0);
    const totalDistance = distance + returnDistance;
    const revenue = Math.round(totalDistance * 45);
    const payload = mapTripToDB({ truckId: req.body.truckId, driverId: req.body.driverId, routeId: null, source, destination, distance, tollCost, returnSource, returnDestination, returnDistance, returnTollCost, startDate: req.body.startDate, endDate: req.body.endDate, status: req.body.status, progress: req.body.progress, revenue, expense: 0 });
    const { data, error } = await supabase.from('trips').update(payload).eq('id', tripId).select();
    if (error) throw error;
    const updatedTrip = data[0];
    if (oldTrip.status !== updatedTrip.status) {
      if (updatedTrip.status === 'In Transit') {
        if (updatedTrip.truck_id) await supabase.from('trucks').update({ status: 'On Route', driver_id: updatedTrip.driver_id }).eq('id', updatedTrip.truck_id);
        if (updatedTrip.driver_id) await supabase.from('drivers').update({ status: 'On Duty', truck_id: updatedTrip.truck_id }).eq('id', updatedTrip.driver_id);
      } else if (updatedTrip.status === 'Delivered' || updatedTrip.status === 'Cancelled') {
        if (updatedTrip.status === 'Delivered') {
          await supabase.from('trips').update({ progress: 100 }).eq('id', tripId);
          const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
          await supabase.from('transactions').insert({ id: txnId, date: new Date().toISOString().split('T')[0], type: 'Income', category: 'Trip Revenue', amount: updatedTrip.revenue||0, description: `Round-Trip dispatch revenue for ${updatedTrip.id}`, reference_id: updatedTrip.id, payment_method: 'SBI Bank' });
          const { data: bAcc } = await supabase.from('financial_accounts').select('balance').eq('name', 'SBI Bank').single();
          if (bAcc) await supabase.from('financial_accounts').update({ balance: (Number(bAcc.balance)||0) + (updatedTrip.revenue||0) }).eq('name', 'SBI Bank');
          const { data: drivers } = await supabase.from('drivers').select('trips_completed').eq('id', updatedTrip.driver_id);
          const currentTrips = drivers&&drivers.length>0?(drivers[0].trips_completed||0):0;
          await supabase.from('drivers').update({ status: 'Available', trips_completed: currentTrips+1 }).eq('id', updatedTrip.driver_id);
        } else {
          if (updatedTrip.driver_id) await supabase.from('drivers').update({ status: 'Available' }).eq('id', updatedTrip.driver_id);
        }
        if (updatedTrip.truck_id) await supabase.from('trucks').update({ status: 'Idle' }).eq('id', updatedTrip.truck_id);
      }
    }
    res.json(mapTripToJS(updatedTrip));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/trips/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('trips', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Trip not found" });
    mockDB.trips.splice(idx, 1);
    return res.json({ message: 'Trip deleted successfully' });
  }
  try {
    const { error } = await supabase.from('trips').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 5. MAINTENANCE API
// -----------------------------------------------------------------------------
app.post('/api/maintenance', async (req, res) => {
  if (MOCK_MODE) {
    const newId = genId('MNT', mockDB.maintenance);
    const maint = { id: newId, truck_id: req.body.truckId, date: req.body.date, type: req.body.type, cost: req.body.cost||0, status: req.body.status||'In Progress' };
    mockDB.maintenance.push(maint);
    if (maint.status === 'In Progress') { const t = mockFind('trucks', maint.truck_id); if (t) t.status = 'Maintenance'; }
    return res.status(201).json(mapMaintenanceToJS(maint));
  }
  try {
    const { data: list } = await supabase.from('maintenance').select('id');
    const newId = `MNT-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapMaintenanceToDB({ id: newId, truckId: req.body.truckId, date: req.body.date, type: req.body.type, cost: req.body.cost, status: req.body.status||'In Progress' });
    const { data, error } = await supabase.from('maintenance').insert([payload]).select();
    if (error) throw error;
    if (payload.status === 'In Progress') await supabase.from('trucks').update({ status: 'Maintenance' }).eq('id', payload.truck_id);
    res.status(201).json(mapMaintenanceToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/maintenance/:id', async (req, res) => {
  const maintId = req.params.id;
  if (MOCK_MODE) {
    const idx = mockFindIndex('maintenance', maintId);
    if (idx === -1) return res.status(404).json({ error: "Maintenance not found" });
    const old = { ...mockDB.maintenance[idx] };
    Object.assign(mockDB.maintenance[idx], { truck_id: req.body.truckId||old.truck_id, date: req.body.date||old.date, type: req.body.type||old.type, cost: req.body.cost!==undefined?Number(req.body.cost):old.cost, status: req.body.status||old.status });
    const updated = mockDB.maintenance[idx];
    if (old.status !== updated.status && updated.status === 'Completed') {
      const t = mockFind('trucks', updated.truck_id);
      if (t) { t.status = 'Idle'; t.last_service = updated.date; }
      const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
      mockDB.transactions.unshift({ id: txnId, date: updated.date, type: 'Expense', category: 'Maintenance', amount: updated.cost||0, description: `Workshop charges: ${updated.type} (${updated.id})`, reference_id: updated.id, payment_method: 'Bank Transfer' });
      mockBalance('Bank Transfer', -(updated.cost||0));
    }
    return res.json(mapMaintenanceToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('maintenance').select('*').eq('id', maintId);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Maintenance log not found" });
    const oldMaint = oldData[0];
    const payload = mapMaintenanceToDB({ truckId: req.body.truckId, date: req.body.date, type: req.body.type, cost: req.body.cost, status: req.body.status });
    const { data, error } = await supabase.from('maintenance').update(payload).eq('id', maintId).select();
    if (error) throw error;
    const updatedMaint = data[0];
    if (oldMaint.status !== updatedMaint.status && updatedMaint.status === 'Completed') {
      await supabase.from('trucks').update({ status: 'Idle', last_service: updatedMaint.date }).eq('id', updatedMaint.truck_id);
      const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
      await supabase.from('transactions').insert({ id: txnId, date: updatedMaint.date, type: 'Expense', category: 'Maintenance', amount: updatedMaint.cost||0, description: `Workshop repair charges: ${updatedMaint.type} (${updatedMaint.id})`, reference_id: updatedMaint.id, payment_method: 'Bank Transfer' });
      const { data: bAcc } = await supabase.from('financial_accounts').select('balance').eq('name', 'Bank Transfer').single();
      if (bAcc) await supabase.from('financial_accounts').update({ balance: (Number(bAcc.balance)||0) - Number(updatedMaint.cost||0) }).eq('name', 'Bank Transfer');
    }
    res.json(mapMaintenanceToJS(updatedMaint));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/maintenance/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('maintenance', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Maintenance not found" });
    mockDB.maintenance.splice(idx, 1);
    return res.json({ message: 'Maintenance record deleted successfully' });
  }
  try {
    const { error } = await supabase.from('maintenance').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 6. ROUTES API
// -----------------------------------------------------------------------------
app.post('/api/routes', async (req, res) => {
  if (MOCK_MODE) {
    const newId = genId('RTE', mockDB.routes);
    const route = { id: newId, name: req.body.name, source: req.body.source, destination: req.body.destination, distance: req.body.distance, toll_cost: req.body.tollCost, est_days: req.body.estDays };
    mockDB.routes.push(route);
    return res.status(201).json(mapRouteToJS(route));
  }
  try {
    const { data: list } = await supabase.from('routes').select('id');
    const newId = `RTE-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapRouteToDB({ id: newId, name: req.body.name, source: req.body.source, destination: req.body.destination, distance: req.body.distance, tollCost: req.body.tollCost, estDays: req.body.estDays });
    const { data, error } = await supabase.from('routes').insert([payload]).select();
    if (error) throw error;
    res.status(201).json(mapRouteToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/routes/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('routes', req.params.id);
    if (idx !== -1) mockDB.routes.splice(idx, 1);
    return res.json({ message: 'Route deleted successfully' });
  }
  try {
    const { error } = await supabase.from('routes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Route deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 7. TRANSACTIONS API
// -----------------------------------------------------------------------------
app.post('/api/transactions', requireAdmin, async (req, res) => {
  if (MOCK_MODE) {
    const newId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    const txn = { id: newId, date: req.body.date, type: req.body.type, category: req.body.category, amount: Number(req.body.amount)||0, description: req.body.description, reference_id: req.body.referenceId||null, payment_method: req.body.paymentMethod||'Cash' };
    mockDB.transactions.unshift(txn);
    mockBalance(txn.payment_method, txn.type === 'Income' ? txn.amount : -txn.amount);
    return res.status(201).json(mapTransactionToJS(txn));
  }
  try {
    const { data: list } = await supabase.from('transactions').select('id');
    const newId = `TXN-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapTransactionToDB({ id: newId, date: req.body.date, type: req.body.type, category: req.body.category, amount: req.body.amount, description: req.body.description, referenceId: req.body.referenceId||null, paymentMethod: req.body.paymentMethod||'Cash' });
    const { data, error } = await supabase.from('transactions').insert([payload]).select();
    if (error) throw error;
    if (payload.payment_method) {
      const { data: account } = await supabase.from('financial_accounts').select('balance').eq('name', payload.payment_method).single();
      if (account) { const curBal = Number(account.balance)||0; const newBal = payload.type==='Income'?curBal+Number(payload.amount):curBal-Number(payload.amount); await supabase.from('financial_accounts').update({ balance: newBal }).eq('name', payload.payment_method); }
    }
    res.status(201).json(mapTransactionToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/transactions/:id', requireAdmin, async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('transactions', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Transaction not found" });
    const old = mockDB.transactions[idx];
    mockBalance(old.payment_method, old.type === 'Income' ? -old.amount : old.amount);
    Object.assign(mockDB.transactions[idx], { date: req.body.date||old.date, type: req.body.type||old.type, category: req.body.category||old.category, amount: Number(req.body.amount)||old.amount, description: req.body.description||old.description, reference_id: req.body.referenceId!==undefined?req.body.referenceId:old.reference_id, payment_method: req.body.paymentMethod||old.payment_method });
    const updated = mockDB.transactions[idx];
    mockBalance(updated.payment_method, updated.type === 'Income' ? updated.amount : -updated.amount);
    return res.json(mapTransactionToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('transactions').select('*').eq('id', req.params.id);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Transaction not found" });
    const oldTxn = oldData[0];
    const payload = mapTransactionToDB({ date: req.body.date, type: req.body.type, category: req.body.category, amount: req.body.amount, description: req.body.description, referenceId: req.body.referenceId, paymentMethod: req.body.paymentMethod });
    const { data, error } = await supabase.from('transactions').update(payload).eq('id', req.params.id).select();
    if (error) throw error;
    const updatedTxn = data[0];
    if (oldTxn.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', oldTxn.payment_method).single();
      if (acc) { const rev = oldTxn.type==='Income'?Number(acc.balance)-Number(oldTxn.amount):Number(acc.balance)+Number(oldTxn.amount); await supabase.from('financial_accounts').update({ balance: rev }).eq('name', oldTxn.payment_method); }
    }
    if (updatedTxn.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', updatedTxn.payment_method).single();
      if (acc) { const newBal = updatedTxn.type==='Income'?Number(acc.balance)+Number(updatedTxn.amount):Number(acc.balance)-Number(updatedTxn.amount); await supabase.from('financial_accounts').update({ balance: newBal }).eq('name', updatedTxn.payment_method); }
    }
    res.json(mapTransactionToJS(updatedTxn));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', requireAdmin, async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('transactions', req.params.id);
    if (idx !== -1) {
      const txn = mockDB.transactions[idx];
      mockBalance(txn.payment_method, txn.type === 'Income' ? -txn.amount : txn.amount);
      mockDB.transactions.splice(idx, 1);
    }
    return res.json({ message: 'Transaction removed successfully' });
  }
  try {
    const { data: list } = await supabase.from('transactions').select('*').eq('id', req.params.id);
    if (list&&list.length>0) {
      const txn = list[0];
      if (txn.payment_method) {
        const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', txn.payment_method).single();
        if (acc) { const rev = txn.type==='Income'?Number(acc.balance)-Number(txn.amount):Number(acc.balance)+Number(txn.amount); await supabase.from('financial_accounts').update({ balance: rev }).eq('name', txn.payment_method); }
      }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Transaction record removed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 8. FINANCIAL ACCOUNTS API
// -----------------------------------------------------------------------------
app.post('/api/financial-accounts', async (req, res) => {
  if (MOCK_MODE) {
    const newId = genId('ACC', mockDB.financial_accounts);
    const acc = { id: newId, name: req.body.name, type: req.body.type, balance: Number(req.body.balance)||0, account_number: req.body.accountNumber||null, ifsc_code: req.body.ifscCode||null, bank_name: req.body.bankName||null };
    mockDB.financial_accounts.push(acc);
    return res.status(201).json(mapFinancialAccountToJS(acc));
  }
  try {
    const { data: list } = await supabase.from('financial_accounts').select('id');
    const newId = `ACC-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapFinancialAccountToDB({ id: newId, name: req.body.name, type: req.body.type, balance: req.body.balance||0, accountNumber: req.body.accountNumber||null, ifscCode: req.body.ifscCode||null, bankName: req.body.bankName||null });
    const { data, error } = await supabase.from('financial_accounts').insert([payload]).select();
    if (error) throw error;
    res.status(201).json(mapFinancialAccountToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/financial-accounts/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('financial_accounts', req.params.id);
    if (idx !== -1) mockDB.financial_accounts.splice(idx, 1);
    return res.json({ message: 'Account removed successfully' });
  }
  try {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Account removed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 9. FUEL LOGS API
// -----------------------------------------------------------------------------
async function createFuelLog(data, res, isUpdate = false, oldLog = null) {
  const totalCost = Number(data.quantity) * Number(data.pricePerLiter);
  if (MOCK_MODE) {
    if (isUpdate && oldLog) {
      mockBalance(oldLog.payment_method, oldLog.total_cost);
      const oldTxnIdx = mockDB.transactions.findIndex(t => t.reference_id === oldLog.id);
      if (oldTxnIdx !== -1) mockDB.transactions.splice(oldTxnIdx, 1);
      const idx = mockFindIndex('fuel_logs', oldLog.id);
      if (idx !== -1) Object.assign(mockDB.fuel_logs[idx], { truck_id: data.truckId, driver_id: data.driverId, trip_id: data.tripId||null, date: data.date, quantity: data.quantity, price_per_liter: data.pricePerLiter, total_cost: totalCost, odometer: data.odometer, payment_method: data.paymentMethod });
      const updated = mockDB.fuel_logs[idx];
      const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
      const truck = mockDB.trucks.find(t => t.id === updated.truck_id);
      mockDB.transactions.unshift({ id: txnId, date: updated.date, type: 'Expense', category: 'Fuel', amount: totalCost, description: `Fuel refill: ${updated.quantity}L @ ₹${updated.price_per_liter}/L for ${truck?.plate||updated.truck_id}`, reference_id: updated.id, payment_method: updated.payment_method });
      mockBalance(updated.payment_method, -totalCost);
      return res.json(mapFuelLogToJS(updated));
    }
    const newId = genId('FUL', mockDB.fuel_logs);
    const log = { id: newId, truck_id: data.truckId, driver_id: data.driverId, trip_id: data.tripId||null, date: data.date, quantity: Number(data.quantity), price_per_liter: Number(data.pricePerLiter), total_cost: totalCost, odometer: Number(data.odometer), payment_method: data.paymentMethod, reference_id: null };
    mockDB.fuel_logs.unshift(log);
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    const truck = mockDB.trucks.find(t => t.id === data.truckId);
    mockDB.transactions.unshift({ id: txnId, date: data.date, type: 'Expense', category: 'Fuel', amount: totalCost, description: `Fuel refill: ${data.quantity}L @ ₹${data.pricePerLiter}/L for ${truck?.plate||data.truckId}`, reference_id: newId, payment_method: data.paymentMethod });
    mockBalance(data.paymentMethod, -totalCost);
    return res.status(201).json(mapFuelLogToJS(log));
  }
  // Supabase path
  return null;
}

app.post('/api/fuel-logs', async (req, res) => {
  const data = { truckId: req.body.truckId, driverId: req.body.driverId, tripId: req.body.tripId||null, date: req.body.date, quantity: req.body.quantity, pricePerLiter: req.body.pricePerLiter, odometer: req.body.odometer, paymentMethod: req.body.paymentMethod };
  if (MOCK_MODE) return createFuelLog(data, res);
  try {
    const totalCost = Number(req.body.quantity) * Number(req.body.pricePerLiter);
    const { data: list } = await supabase.from('fuel_logs').select('id');
    const newId = `FUL-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapFuelLogToDB({ id: newId, ...data, totalCost });
    const { data: inserted, error } = await supabase.from('fuel_logs').insert([payload]).select();
    if (error) throw error;
    const log = inserted[0];
    const { data: truckData } = await supabase.from('trucks').select('plate').eq('id', payload.truck_id).single();
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    await supabase.from('transactions').insert({ id: txnId, date: payload.date, type: 'Expense', category: 'Fuel', amount: totalCost, description: `Fuel purchase: ${payload.quantity}L @ ₹${payload.price_per_liter}/L for truck ${truckData?.plate||payload.truck_id}`, reference_id: log.id, payment_method: payload.payment_method });
    const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', payload.payment_method).single();
    if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance) - totalCost }).eq('name', payload.payment_method);
    res.status(201).json(mapFuelLogToJS(log));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/fuel-logs/:id', async (req, res) => {
  if (MOCK_MODE) {
    const oldLog = mockDB.fuel_logs.find(f => f.id === req.params.id);
    if (!oldLog) return res.status(404).json({ error: "Fuel log not found" });
    const data = { truckId: req.body.truckId, driverId: req.body.driverId, tripId: req.body.tripId||null, date: req.body.date, quantity: req.body.quantity, pricePerLiter: req.body.pricePerLiter, odometer: req.body.odometer, paymentMethod: req.body.paymentMethod };
    return createFuelLog(data, res, true, oldLog);
  }
  try {
    const { data: oldData } = await supabase.from('fuel_logs').select('*').eq('id', req.params.id);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "Fuel log not found" });
    const oldLog = oldData[0];
    const totalCost = Number(req.body.quantity) * Number(req.body.pricePerLiter);
    const payload = mapFuelLogToDB({ truckId: req.body.truckId, driverId: req.body.driverId, tripId: req.body.tripId||null, date: req.body.date, quantity: req.body.quantity, pricePerLiter: req.body.pricePerLiter, totalCost, odometer: req.body.odometer, paymentMethod: req.body.paymentMethod });
    const { data, error } = await supabase.from('fuel_logs').update(payload).eq('id', req.params.id).select();
    if (error) throw error;
    if (oldLog.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', oldLog.payment_method).single();
      if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)+Number(oldLog.total_cost) }).eq('name', oldLog.payment_method);
      await supabase.from('transactions').delete().eq('reference_id', oldLog.id);
    }
    const { data: truckData } = await supabase.from('trucks').select('plate').eq('id', payload.truck_id).single();
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    await supabase.from('transactions').insert({ id: txnId, date: payload.date, type: 'Expense', category: 'Fuel', amount: totalCost, description: `Fuel purchase: ${payload.quantity}L @ ₹${payload.price_per_liter}/L for ${truckData?.plate||payload.truck_id}`, reference_id: data[0].id, payment_method: payload.payment_method });
    if (payload.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', payload.payment_method).single();
      if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)-totalCost }).eq('name', payload.payment_method);
    }
    res.json(mapFuelLogToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/fuel-logs/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('fuel_logs', req.params.id);
    if (idx !== -1) {
      const log = mockDB.fuel_logs[idx];
      mockBalance(log.payment_method, log.total_cost);
      const txnIdx = mockDB.transactions.findIndex(t => t.reference_id === log.id);
      if (txnIdx !== -1) mockDB.transactions.splice(txnIdx, 1);
      mockDB.fuel_logs.splice(idx, 1);
    }
    return res.json({ message: 'Fuel log deleted successfully' });
  }
  try {
    const { data: oldLog } = await supabase.from('fuel_logs').select('*').eq('id', req.params.id).single();
    if (oldLog) {
      if (oldLog.payment_method) {
        const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', oldLog.payment_method).single();
        if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)+Number(oldLog.total_cost) }).eq('name', oldLog.payment_method);
        await supabase.from('transactions').delete().eq('reference_id', oldLog.id);
      }
    }
    const { error } = await supabase.from('fuel_logs').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Fuel log deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -----------------------------------------------------------------------------
// 10. DEF LOGS API
// -----------------------------------------------------------------------------
app.post('/api/def-logs', async (req, res) => {
  const totalCost = Number(req.body.quantity) * Number(req.body.pricePerLiter);
  if (MOCK_MODE) {
    const newId = genId('DEF', mockDB.def_logs);
    const log = { id: newId, truck_id: req.body.truckId, driver_id: req.body.driverId, trip_id: req.body.tripId||null, date: req.body.date, quantity: Number(req.body.quantity), price_per_liter: Number(req.body.pricePerLiter), total_cost: totalCost, odometer: Number(req.body.odometer), payment_method: req.body.paymentMethod, reference_id: null };
    mockDB.def_logs.unshift(log);
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    const truck = mockDB.trucks.find(t => t.id === req.body.truckId);
    mockDB.transactions.unshift({ id: txnId, date: req.body.date, type: 'Expense', category: 'DEF / AdBlue', amount: totalCost, description: `DEF refill: ${req.body.quantity}L @ ₹${req.body.pricePerLiter}/L for ${truck?.plate||req.body.truckId}`, reference_id: newId, payment_method: req.body.paymentMethod });
    mockBalance(req.body.paymentMethod, -totalCost);
    return res.status(201).json(mapDefLogToJS(log));
  }
  try {
    const { data: list } = await supabase.from('def_logs').select('id');
    const newId = `DEF-${String((list||[]).length+1).padStart(3,'0')}`;
    const payload = mapDefLogToDB({ id: newId, truckId: req.body.truckId, driverId: req.body.driverId, tripId: req.body.tripId||null, date: req.body.date, quantity: req.body.quantity, pricePerLiter: req.body.pricePerLiter, totalCost, odometer: req.body.odometer, paymentMethod: req.body.paymentMethod });
    const { data, error } = await supabase.from('def_logs').insert([payload]).select();
    if (error) throw error;
    const log = data[0];
    const { data: truckData } = await supabase.from('trucks').select('plate').eq('id', payload.truck_id).single();
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    await supabase.from('transactions').insert({ id: txnId, date: payload.date, type: 'Expense', category: 'DEF / AdBlue', amount: totalCost, description: `DEF refill: ${payload.quantity}L @ ₹${payload.price_per_liter}/L for ${truckData?.plate||payload.truck_id}`, reference_id: log.id, payment_method: payload.payment_method });
    const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', payload.payment_method).single();
    if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)-totalCost }).eq('name', payload.payment_method);
    res.status(201).json(mapDefLogToJS(log));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/def-logs/:id', async (req, res) => {
  const totalCost = Number(req.body.quantity) * Number(req.body.pricePerLiter);
  if (MOCK_MODE) {
    const idx = mockFindIndex('def_logs', req.params.id);
    if (idx === -1) return res.status(404).json({ error: "DEF log not found" });
    const old = mockDB.def_logs[idx];
    mockBalance(old.payment_method, old.total_cost);
    const oldTxnIdx = mockDB.transactions.findIndex(t => t.reference_id === old.id);
    if (oldTxnIdx !== -1) mockDB.transactions.splice(oldTxnIdx, 1);
    Object.assign(mockDB.def_logs[idx], { truck_id: req.body.truckId||old.truck_id, driver_id: req.body.driverId||old.driver_id, trip_id: req.body.tripId||null, date: req.body.date||old.date, quantity: Number(req.body.quantity), price_per_liter: Number(req.body.pricePerLiter), total_cost: totalCost, odometer: Number(req.body.odometer), payment_method: req.body.paymentMethod||old.payment_method });
    const updated = mockDB.def_logs[idx];
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    const truck = mockDB.trucks.find(t => t.id === updated.truck_id);
    mockDB.transactions.unshift({ id: txnId, date: updated.date, type: 'Expense', category: 'DEF / AdBlue', amount: totalCost, description: `DEF refill: ${updated.quantity}L @ ₹${updated.price_per_liter}/L for ${truck?.plate||updated.truck_id}`, reference_id: updated.id, payment_method: updated.payment_method });
    mockBalance(updated.payment_method, -totalCost);
    return res.json(mapDefLogToJS(updated));
  }
  try {
    const { data: oldData } = await supabase.from('def_logs').select('*').eq('id', req.params.id);
    if (!oldData||oldData.length===0) return res.status(404).json({ error: "DEF log not found" });
    const oldLog = oldData[0];
    const payload = mapDefLogToDB({ truckId: req.body.truckId, driverId: req.body.driverId, tripId: req.body.tripId||null, date: req.body.date, quantity: req.body.quantity, pricePerLiter: req.body.pricePerLiter, totalCost, odometer: req.body.odometer, paymentMethod: req.body.paymentMethod });
    const { data, error } = await supabase.from('def_logs').update(payload).eq('id', req.params.id).select();
    if (error) throw error;
    if (oldLog.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', oldLog.payment_method).single();
      if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)+Number(oldLog.total_cost) }).eq('name', oldLog.payment_method);
      await supabase.from('transactions').delete().eq('reference_id', oldLog.id);
    }
    const { data: truckData } = await supabase.from('trucks').select('plate').eq('id', payload.truck_id).single();
    const txnId = 'TXN-' + Math.random().toString(36).substr(2,9).toUpperCase();
    await supabase.from('transactions').insert({ id: txnId, date: payload.date, type: 'Expense', category: 'DEF / AdBlue', amount: totalCost, description: `DEF refill: ${payload.quantity}L @ ₹${payload.price_per_liter}/L for ${truckData?.plate||payload.truck_id}`, reference_id: data[0].id, payment_method: payload.payment_method });
    if (payload.payment_method) {
      const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', payload.payment_method).single();
      if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)-totalCost }).eq('name', payload.payment_method);
    }
    res.json(mapDefLogToJS(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/def-logs/:id', async (req, res) => {
  if (MOCK_MODE) {
    const idx = mockFindIndex('def_logs', req.params.id);
    if (idx !== -1) {
      const log = mockDB.def_logs[idx];
      mockBalance(log.payment_method, log.total_cost);
      const txnIdx = mockDB.transactions.findIndex(t => t.reference_id === log.id);
      if (txnIdx !== -1) mockDB.transactions.splice(txnIdx, 1);
      mockDB.def_logs.splice(idx, 1);
    }
    return res.json({ message: 'DEF log deleted successfully' });
  }
  try {
    const { data: oldLog } = await supabase.from('def_logs').select('*').eq('id', req.params.id).single();
    if (oldLog) {
      if (oldLog.payment_method) {
        const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('name', oldLog.payment_method).single();
        if (acc) await supabase.from('financial_accounts').update({ balance: Number(acc.balance)+Number(oldLog.total_cost) }).eq('name', oldLog.payment_method);
        await supabase.from('transactions').delete().eq('reference_id', oldLog.id);
      }
    }
    const { error } = await supabase.from('def_logs').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'DEF log deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fallback route
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`Truck Management Portal is running on port ${PORT}`);
    console.log(`Access website at http://localhost:${PORT}`);
    console.log(`Mode: ${MOCK_MODE ? 'DEMO (In-Memory)' : 'PRODUCTION (Supabase)'}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
