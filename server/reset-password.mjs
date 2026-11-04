// Uso: node reset-password.mjs <utente> <nuova-password>
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('Uso: node reset-password.mjs <utente> <nuova-password>');
  process.exit(1);
}
if (password.length < 8 || password.length > 200) {
  console.error('La password deve avere almeno 8 caratteri.');
  process.exit(1);
}
const file = path.join(DATA_DIR, 'tracker.db');
if (!existsSync(file)) {
  console.error(`Database non trovato: ${file}`);
  process.exit(1);
}

const db = new DatabaseSync(file);
const r = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
  .run(bcrypt.hashSync(password, 10), username);
if (!r.changes) {
  const users = db.prepare('SELECT username FROM users ORDER BY username').all().map(u => u.username);
  console.error(`Utente "${username}" non trovato. Utenti presenti: ${users.join(', ') || '(nessuno)'}`);
  process.exit(1);
}
console.log(`Password di "${username}" aggiornata.`);
