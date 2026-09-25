const { db } = require('@vercel/postgres');
require('dotenv').config();

async function run() {
  const client = await db.connect();
  try {
    await client.sql`ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS ghost_data TEXT`;
    console.log("Column added");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
  }
}
run();
