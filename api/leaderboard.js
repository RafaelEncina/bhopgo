const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const map = req.query.map;
    if (!map) return res.status(400).json({ error: 'Falta el mapa' });
    const { rows } = await sql`
      SELECT l.username, l.time_seconds, l.created_at
      FROM leaderboard l
      WHERE l.map_id = ${map}
      ORDER BY l.time_seconds ASC
      LIMIT 10`;
    return res.status(200).json({ entries: rows });
  }

  if (req.method === 'POST') {
    const user = auth(req);
    if (!user) return res.status(401).json({ error: 'No autenticado' });
    const { map, time } = req.body || {};
    if (!map || typeof time !== 'number' || time <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    // Only insert if it's better than the user's existing time on this map
    const { rows: existing } = await sql`
      SELECT id, time_seconds FROM leaderboard
      WHERE user_id = ${user.uid} AND map_id = ${map}`;
    if (existing.length > 0) {
      if (time < existing[0].time_seconds) {
        await sql`
          UPDATE leaderboard
          SET time_seconds = ${time}, username = ${user.username}, created_at = now()
          WHERE id = ${existing[0].id}`;
      }
    } else {
      await sql`
        INSERT INTO leaderboard (user_id, map_id, username, time_seconds)
        VALUES (${user.uid}, ${map}, ${user.username}, ${time})`;
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
};
