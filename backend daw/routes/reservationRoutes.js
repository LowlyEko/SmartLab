const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// Create a new reservation
router.post('/', async (req, res) => {
  const { student_name, equipment_name, quantity, date_borrowed } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reservations (student_name, equipment_name, quantity, date_borrowed) VALUES ($1, $2, $3, $4) RETURNING *',
      [student_name, equipment_name, quantity, date_borrowed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all reservations (for the admin dashboard)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status (e.g., mark as 'Returned' or 'Damaged')
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;