import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let isTableEnsured = false;

async function ensureTable() {
  if (isTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL
    );
  `);
  isTableEnsured = true;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    const timestamp = Date.now();
    await pool.query('INSERT INTO requests (timestamp) VALUES ($1)', [timestamp]);

    const { rows } = await pool.query('SELECT timestamp FROM requests');
    if (!rows.length) return res.status(200).json({});

    const grouped = {};
    for (const { timestamp } of rows) {
      const sec = Math.floor(timestamp / 1000) * 1000;
      grouped[sec] = (grouped[sec] || 0) + 1;
    }

    const data = Object.entries(grouped).map(([ts, count]) => [Number(ts), count]);

    res.status(200).json({
      totalRequest: rows.length,
      data: data.sort((a, b) => a[0] - b[0])
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
