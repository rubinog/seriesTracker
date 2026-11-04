// Uso: node list-users.mjs
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const file = path.join(DATA_DIR, 'tracker.db');
if (!existsSync(file)) {
  console.error(`Database non trovato: ${file}`);
  process.exit(1);
}

const db = new DatabaseSync(file, { readOnly: true });
const users = db.prepare(
  'SELECT u.username, (SELECT COUNT(*) FROM shows s WHERE s.user_id = u.id) AS shows FROM users u ORDER BY u.username',
).all();
if (!users.length) console.log('Nessun utente registrato.');
for (const u of users) console.log(`${u.username}  (${u.shows} serie)`);
