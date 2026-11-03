import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import fstatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3000);
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP !== 'false';
mkdirSync(DATA_DIR, { recursive: true });

// Secret JWT persistente se non fornito
let secret = process.env.JWT_SECRET;
if (!secret) {
  const f = path.join(DATA_DIR, '.jwt_secret');
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('hex'));
  secret = readFileSync(f, 'utf8');
}

const db = new DatabaseSync(path.join(DATA_DIR, 'tracker.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL, settings TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS shows (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  name TEXT NOT NULL, poster TEXT, status TEXT NOT NULL DEFAULT 'watching',
  rating INTEGER, updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, tmdb_id)
);
CREATE TABLE IF NOT EXISTS watched (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL, season INTEGER NOT NULL, episode INTEGER NOT NULL,
  watched_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, tmdb_id, season, episode)
);
`);

const app = Fastify({ logger: true });
await app.register(jwt, { secret });

app.decorate('auth', async (req, reply) => {
  try { await req.jwtVerify(); } catch { reply.code(401).send({ error: 'unauthorized' }); }
});
const guard = { preHandler: app.auth };

// ---- Auth ----
const creds = { schema: { body: { type: 'object', required: ['username', 'password'], properties: {
  username: { type: 'string', minLength: 3, maxLength: 32 },
  password: { type: 'string', minLength: 8, maxLength: 200 } } } } };

app.post('/api/auth/register', creds, async (req, reply) => {
  if (!ALLOW_SIGNUP) return reply.code(403).send({ error: 'signup_disabled' });
  const { username, password } = req.body;
  try {
    const r = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, bcrypt.hashSync(password, 10));
    return { token: app.jwt.sign({ id: Number(r.lastInsertRowid) }, { expiresIn: '90d' }) };
  } catch { return reply.code(409).send({ error: 'username_taken' }); }
});

app.post('/api/auth/login', creds, async (req, reply) => {
  const { username, password } = req.body;
  const u = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return reply.code(401).send({ error: 'invalid_credentials' });
  return { token: app.jwt.sign({ id: u.id }, { expiresIn: '90d' }) };
});

app.get('/api/me', guard, async (req) => {
  const u = db.prepare('SELECT username, settings FROM users WHERE id = ?').get(req.user.id);
  return { username: u.username, settings: JSON.parse(u.settings) };
});

app.put('/api/me/settings', guard, async (req) => {
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(req.body ?? {}), req.user.id);
  return { ok: true };
});

// ---- Libreria ----
// Restituisce tutto lo stato utente in una chiamata (sync semplice)
app.get('/api/library', guard, async (req) => {
  const uid = req.user.id;
  const shows = db.prepare('SELECT tmdb_id AS id, name, poster, status, rating, updated_at AS updatedAt FROM shows WHERE user_id = ?').all(uid);
  const watched = db.prepare('SELECT tmdb_id AS id, season, episode FROM watched WHERE user_id = ?').all(uid);
  return { shows, watched };
});

app.put('/api/shows/:id', guard, async (req) => {
  const { name, poster = null, status = 'watching', rating = null } = req.body;
  db.prepare(`INSERT INTO shows (user_id, tmdb_id, name, poster, status, rating, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, tmdb_id) DO UPDATE SET name=excluded.name, poster=excluded.poster,
    status=excluded.status, rating=excluded.rating, updated_at=excluded.updated_at`)
    .run(req.user.id, Number(req.params.id), name, poster, status, rating, Date.now());
  return { ok: true };
});

app.delete('/api/shows/:id', guard, async (req) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM shows WHERE user_id = ? AND tmdb_id = ?').run(req.user.id, id);
  db.prepare('DELETE FROM watched WHERE user_id = ? AND tmdb_id = ?').run(req.user.id, id);
  return { ok: true };
});

// body: { episodes: [{season, episode}], watched: boolean }
app.post('/api/shows/:id/watched', guard, async (req) => {
  const id = Number(req.params.id);
  const { episodes = [], watched = true } = req.body ?? {};
  const ins = db.prepare('INSERT OR IGNORE INTO watched (user_id, tmdb_id, season, episode, watched_at) VALUES (?,?,?,?,?)');
  const del = db.prepare('DELETE FROM watched WHERE user_id=? AND tmdb_id=? AND season=? AND episode=?');
  db.exec('BEGIN');
  try {
    for (const e of episodes) {
      if (watched) ins.run(req.user.id, id, e.season, e.episode, Date.now());
      else del.run(req.user.id, id, e.season, e.episode);
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return { ok: true };
});

// ---- Proxy TMDB (la chiave resta sul server) ----
const tmdbCache = new Map();
app.get('/api/tmdb/*', guard, async (req, reply) => {
  if (!TMDB_KEY) return reply.code(503).send({ error: 'tmdb_key_missing' });
  const sub = req.params['*'];
  if (!/^(search\/tv|trending\/tv\/\w+|discover\/tv|genre\/tv\/list|tv\/\d+(\/season\/\d+)?)$/.test(sub))
    return reply.code(400).send({ error: 'bad_path' });
  const url = new URL(`https://api.themoviedb.org/3/${sub}`);
  for (const [k, v] of Object.entries(req.query)) url.searchParams.set(k, String(v));
  url.searchParams.delete('api_key');
  const headers = {};
  if (TMDB_KEY.length > 40) headers.Authorization = `Bearer ${TMDB_KEY}`;
  else url.searchParams.set('api_key', TMDB_KEY);
  const cacheKey = url.pathname + url.search.replace(/api_key=[^&]+&?/, '');
  const hit = tmdbCache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.data;
  const res = await fetch(url, { headers });
  if (!res.ok) return reply.code(res.status).send({ error: 'tmdb_error' });
  const data = await res.json();
  tmdbCache.set(cacheKey, { data, exp: Date.now() + 6 * 3600e3 });
  return data;
});

app.get('/api/health', async () => ({ ok: true }));

// ---- Frontend statico ----
const webDir = path.join(__dirname, 'public');
if (existsSync(webDir)) {
  await app.register(fstatic, { root: webDir });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api') ? reply.code(404).send({ error: 'not_found' }) : reply.sendFile('index.html'));
}

app.listen({ port: PORT, host: '0.0.0.0' });
