const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { username, password } = req.body || {};
  if (!username || !password || username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Usuario (mín. 3) o contraseña (mín. 4) inválidos' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${hash})
      RETURNING id, username`;
    const user = rows[0];
    await sql`INSERT INTO progress (user_id, data) VALUES (${user.id}, '{}'::jsonb)`;
    const token = jwt.sign({ uid: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, username: user.username });
  } catch (e) {
    if (String(e).includes('duplicate key')) return res.status(409).json({ error: 'Ese usuario ya existe' });
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
