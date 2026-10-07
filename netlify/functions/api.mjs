import crypto from 'node:crypto';
import { getConnectionString } from '@netlify/database';
import postgres from 'postgres';
import { session, checkPassword, makeCookie, clearCookie } from '../lib/auth.mjs';

const sql = postgres(await getConnectionString(), { max: 3 });
const OK = /^[A-Za-z0-9_\-.~:@+]{1,100}(\/[A-Za-z0-9_\-.~:@+]{1,100}){0,5}$/;
const parentOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const json = (o, status = 200, headers = {}) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const isObj = d => d && typeof d === 'object' && !Array.isArray(d) && JSON.stringify(d).length < 1_000_000;

export default async (req) => {
  if (req.method !== 'POST' || !(req.headers.get('content-type') || '').includes('application/json')) return json({ error: 'bad_request' }, 400);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  if (b.op === 'login') {
    if (!checkPassword(String(b.u || ''), String(b.p || ''))) { await new Promise(r => setTimeout(r, 800)); return json({ error: 'bad_credentials' }, 401); }
    return json({ id: b.u }, 200, { 'set-cookie': makeCookie(b.u) });
  }
  if (b.op === 'logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });

  const me = session(req);
  if (!me) return json({ error: 'unauthenticated' }, 401);
  if (b.op === 'me') return json({ id: me });

  try {
    if (b.op === 'upload') {
      if (typeof b.b64 !== 'string' || b.b64.length > 5_600_000) return json({ error: 'too_large' }, 413);
      const id = crypto.randomBytes(16).toString('hex');
      await sql`INSERT INTO files (id, name, content_type, data) VALUES (${id}, ${String(b.name || '').slice(0, 200)}, ${String(b.ct || 'application/octet-stream').slice(0, 100)}, ${Buffer.from(b.b64, 'base64')})`;
      return json({ id, contentType: b.ct });
    }
    const path = String(b.path || '');
    if (!OK.test(path)) return json({ error: 'bad_path' }, 400);
    const parent = parentOf(path);

    if (b.op === 'get') {
      const r = await sql`SELECT data FROM docs WHERE path = ${path}`;
      return json({ data: r.length ? r[0].data : null });
    }
    if (b.op === 'list') {
      const r = await sql`SELECT path, data FROM docs WHERE parent = ${path} ORDER BY path`;
      return json({ docs: r.map(x => ({ id: x.path.split('/').pop(), data: x.data })) });
    }
    if (b.op === 'delete') { await sql`DELETE FROM docs WHERE path = ${path}`; return json({ ok: true }); }
    if (!isObj(b.data)) return json({ error: 'bad_data' }, 400);
    if (b.op === 'set') {
      await sql`INSERT INTO docs (path, parent, data) VALUES (${path}, ${parent}, ${sql.json(b.data)})
                ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      return json({ ok: true });
    }
    if (b.op === 'create') {
      const r = await sql`INSERT INTO docs (path, parent, data) VALUES (${path}, ${parent}, ${sql.json(b.data)})
                          ON CONFLICT (path) DO NOTHING RETURNING path`;
      return json({ created: r.length > 0 });
    }
    if (b.op === 'update') {
      const r = await sql`UPDATE docs SET data = data || ${sql.json(b.data)}::jsonb, updated_at = now() WHERE path = ${path} RETURNING path`;
      return r.length ? json({ ok: true }) : json({ error: 'not_found' }, 404);
    }
    return json({ error: 'bad_op' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
};

export const config = { path: '/api' };
