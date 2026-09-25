const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
  const { rows } = await sql`SELECT id, username, password_hash FROM users WHERE username=${username}`;
  const isAdmin = process.env.ADMIN_N && username === process.env.ADMIN_N && password === process.env.ADMIN_P;
  let user = rows[0];
  let role = 'user';

  if (isAdmin) {
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      const { rows: newRows } = await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${hash}) RETURNING id, username`;
      user = newRows[0];
      await sql`INSERT INTO progress (user_id, data) VALUES (${user.id}, '{}'::jsonb)`;
    }
    role = 'admin';
  } else {
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  }

  const token = jwt.sign({ uid: user.id, username: user.username, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.status(200).json({ token, username: user.username, role });
};
