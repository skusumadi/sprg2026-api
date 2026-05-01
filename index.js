const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS pl_entries (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('DB ready');
}

// GET all vendors
app.get('/vendors', async (req, res) => {
  try {
    const r = await pool.query('SELECT data FROM vendors ORDER BY data->>\'brand\'');
    res.json({ ok: true, data: r.rows.map(r => r.data) });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST upsert vendor
app.post('/vendors', async (req, res) => {
  try {
    const v = req.body;
    await pool.query(
      `INSERT INTO vendors (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [v.id, v]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST bulk write vendors
app.post('/vendors/bulk', async (req, res) => {
  try {
    const { data } = req.body;
    await pool.query('DELETE FROM vendors');
    for (const v of data) {
      await pool.query(
        `INSERT INTO vendors (id, data) VALUES ($1, $2)`,
        [v.id, v]
      );
    }
    res.json({ ok: true, count: data.length });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE vendor
app.delete('/vendors/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET all PL entries
app.get('/pl', async (req, res) => {
  try {
    const r = await pool.query('SELECT data FROM pl_entries ORDER BY data->>\'date\'');
    res.json({ ok: true, data: r.rows.map(r => r.data) });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST upsert PL entry
app.post('/pl', async (req, res) => {
  try {
    const e = req.body;
    await pool.query(
      `INSERT INTO pl_entries (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [e.id, e]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST bulk write PL
app.post('/pl/bulk', async (req, res) => {
  try {
    const { data } = req.body;
    await pool.query('DELETE FROM pl_entries');
    for (const e of data) {
      await pool.query(
        `INSERT INTO pl_entries (id, data) VALUES ($1, $2)`,
        [e.id, e]
      );
    }
    res.json({ ok: true, count: data.length });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE PL entry
app.delete('/pl/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pl_entries WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Health check
app.get('/', (req, res) => res.json({ ok: true, service: 'SPRG2026 API' }));

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
});
