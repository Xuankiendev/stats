import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default async function handler(req, res) {
  await pool.query(`CREATE TABLE IF NOT EXISTS stats (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  )`)
  await pool.query('INSERT INTO stats DEFAULT VALUES')
  const result = await pool.query(`
    SELECT EXTRACT(EPOCH FROM timestamp) * 1000 AS ts FROM stats ORDER BY timestamp
  `)
  const data = result.rows.map(r => [parseFloat(r.ts), 1])
  res.status(200).json({ data })
}
