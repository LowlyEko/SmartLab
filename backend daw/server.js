const express = require('express');
const cors = require('cors');
require('dotenv').config();
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Main API endpoint
app.use('/api/reservations', reservationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LARS Server active on port ${PORT}`));