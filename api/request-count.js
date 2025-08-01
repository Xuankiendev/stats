import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS request_stats (
        id SERIAL PRIMARY KEY,
        total INTEGER NOT NULL DEFAULT 0
      );
    `);

    const existingCount = await pool.query(`SELECT COUNT(*) as count FROM stats`);
    const oldTotal = parseInt(existingCount.rows[0]?.count) || 0;

    if (req.method === 'POST') {
      await pool.query(`
        INSERT INTO request_stats (id, total) VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET total = request_stats.total + 1;
      `, [oldTotal + 1]);
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const result = await pool.query(`
        SELECT total FROM request_stats WHERE id = 1 LIMIT 1;
      `);
      
      const total = result.rows[0]?.total || 0;
      
      await pool.query(`
        INSERT INTO request_stats (id, total) VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET total = $1;
      `, [total + 1]);
      
      return res.status(200).json({ total: total + 1 });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
