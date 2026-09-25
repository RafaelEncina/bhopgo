const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  if (req.method === 'GET') {
    const { rows } = await sql`SELECT data FROM progress WHERE user_id=${user.uid}`;
    return res.status(200).json({ progress: rows[0] ? rows[0].data : {} });
  }
  if (req.method === 'POST') {
    const { progress } = req.body || {};
    if (!progress) return res.status(400).json({ error: 'Falta el progreso' });
    await sql`UPDATE progress SET data=${JSON.stringify(progress)}::jsonb, updated_at=now() WHERE user_id=${user.uid}`;
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'Método no permitido' });
};
