const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Add this test to see if the connection pool works at startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Pool Connection Test Failed:", err.message);
  } else {
    console.log("Database Connection Successful!");
  }
});

module.exports = pool;