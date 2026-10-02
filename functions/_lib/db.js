export async function getRecord(db, id) {
  return db.prepare('SELECT * FROM records WHERE id = ?').bind(id).first();
}

export async function getSetting(db, key, fallback = null) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : fallback;
}
