import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// Enable CORS (Cross-Origin Resource Sharing)
// This is critical for full-stack apps! It allows the React frontend (running on e.g., localhost:5173)
// to securely make API requests to this Express backend (running on localhost:5000).
app.use(cors());

// Express Middleware to automatically parse incoming request bodies as JSON.
// This allows us to access `req.body` directly in POST/PUT routes!
app.use(express.json());

// ==========================================
// 1. IN-MEMORY DATABASE SEED DATA
// ==========================================
// In a production app, this data would be fetched from a database like MongoDB or PostgreSQL.
// For simplicity and learning, we use a local in-memory JavaScript object.
let database = {
  users: {},
  items: [],
  requests: []
};

// ==========================================
// 2. HTTP ENDPOINTS (API ROUTES)
// ==========================================

// --- Welcome / Root Route ---
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the RentIt P2P Rental API Server! 🚀',
    status: 'Running smoothly',
    documentation: 'See README.md for endpoint details.'
  });
});

// --- GET ALL ITEMS ---
// Route: GET http://localhost:5000/api/items
app.get('/api/items', (req, res) => {
  console.log('GET /api/items - Fetching all listings');
  res.json(database.items);
});

// --- GET SINGLE USER BY ID ---
// Route: GET http://localhost:5000/api/users/:id
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/users/${id} - Fetching profile details`);
  
  const user = database.users[id];
  if (!user) {
    return res.status(404).json({ error: `User with ID ${id} not found.` });
  }

  // Also grab their items
  const userItems = database.items.filter(item => item.lenderId === id);

  res.json({
    ...user,
    listings: userItems
  });
});

// --- CREATE NEW ITEM LISTING ---
// Route: POST http://localhost:5000/api/items
app.post('/api/items', (req, res) => {
  console.log('POST /api/items - Creating a new listing:', req.body);
  const { name, description, category, dailyPrice, depositAmount, condition, lenderId } = req.body;

  if (!name || !dailyPrice || !lenderId) {
    return res.status(400).json({ error: 'Name, daily price, and lender ID are required fields.' });
  }

  const newItem = {
    id: `item-${Date.now()}`, // Simple mock unique ID generator
    name,
    description: description || '',
    category: category || 'General',
    dailyPrice: Number(dailyPrice),
    depositAmount: Number(depositAmount) || 0,
    condition: condition || 'Good',
    lenderId,
    images: req.body.images || ['https://images.unsplash.com/photo-1531685250784-7569952593d2?auto=format&fit=crop&q=80&w=400'],
    availability: 'Available'
  };

  database.items.unshift(newItem);
  res.status(201).json({
    message: 'Item listed successfully!',
    item: newItem
  });
});

// --- GET ALL RENTAL REQUESTS ---
// Route: GET http://localhost:5000/api/requests
app.get('/api/requests', (req, res) => {
  console.log('GET /api/requests - Fetching all rental requests');
  res.json(database.requests);
});

// --- SUBMIT NEW RENTAL REQUEST ---
// Route: POST http://localhost:5000/api/requests
app.post('/api/requests', (req, res) => {
  console.log('POST /api/requests - Requesting item rental:', req.body);
  const { itemId, lenderId, borrowerId, startDate, endDate, totalDays, totalAmount, message } = req.body;

  if (!itemId || !lenderId || !borrowerId) {
    return res.status(400).json({ error: 'Missing required request parameters (itemId, lenderId, borrowerId).' });
  }

  const newRequest = {
    id: `req-${Date.now()}`,
    itemId,
    lenderId,
    borrowerId,
    startDate,
    endDate,
    totalDays: Number(totalDays),
    totalAmount: Number(totalAmount),
    status: 'Pending',
    message: message || ''
  };

  database.requests.push(newRequest);
  res.status(201).json({
    message: 'Rental request submitted successfully!',
    request: newRequest
  });
});

// --- UPDATE REQUEST STATUS (Accept/Reject/Complete) ---
// Route: PUT http://localhost:5000/api/requests/:id
app.put('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting 'Accepted', 'Rejected', or 'Completed'
  console.log(`PUT /api/requests/${id} - Updating status to: ${status}`);

  const request = database.requests.find(req => req.id === id);
  if (!request) {
    return res.status(404).json({ error: `Request with ID ${id} not found.` });
  }

  if (!['Accepted', 'Rejected', 'Completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Accepted, Rejected, or Completed.' });
  }

  request.status = status;

  // Handle side-effects on item listing availability
  const itemIdx = database.items.findIndex(item => item.id === request.itemId);
  if (itemIdx !== -1) {
    if (status === 'Accepted') {
      database.items[itemIdx].availability = 'Rented Out';
    } else if (status === 'Completed') {
      database.items[itemIdx].availability = 'Available';
    }
  }

  res.json({
    message: `Rental request status updated to ${status}!`,
    request
  });
});

// ==========================================
// 3. START SERVER LISTENING
// ==========================================
app.listen(PORT, () => {
  console.log('\n==================================================');
  console.log(`✨ RentIt Express Server running at: http://localhost:${PORT}`);
  console.log(`📡 Open this URL in your browser to see the API: http://localhost:${PORT}/api/items`);
  console.log('==================================================\n');
});
