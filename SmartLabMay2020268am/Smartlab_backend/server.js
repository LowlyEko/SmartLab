// server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

// Global BigInt serialization fix — Prisma returns BigInt for some IDs;
// JSON.stringify cannot handle BigInt natively, so we patch it globally.
BigInt.prototype.toJSON = function () { return Number(this); };

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/inventory',      require('./routes/inventory'));
app.use('/api/reservations',   require('./routes/reservations'));
app.use('/api/accountability', require('./routes/accountability'));
app.use('/api/students',       require('./routes/students'));   // ← NEW: profile completion

app.get('/api/health', (req, res) => res.json({ status: '✅ SmartLab Backend Running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));