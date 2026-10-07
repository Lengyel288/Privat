import { getConnectionString } from '@netlify/database';
import postgres from 'postgres';
import { session } from '../lib/auth.mjs';

const sql = postgres(await getConnectionString(), { max: 2 });

export default async (req, context) => {
  if (!session(req)) return new Response('Unauthorized', { status: 401 });
  const id = new URL(req.url).pathname.split('/').pop();
  if (!/^[0-9a-f]{32}$/.test(id)) return new Response('Not found', { status: 404 });
  const r = await sql`SELECT name, content_type, data FROM files WHERE id = ${id}`;
  if (!r.length) return new Response('Not found', { status: 404 });
  const { name, content_type, data } = r[0];
  return new Response(data, { headers: {
    'content-type': content_type || 'application/octet-stream',
    'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(name || 'subor')}`,
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'x-content-type-options': 'nosniff',
    'cache-control': 'private, max-age=3600',
  } });
};

export const config = { path: '/_blob/*' };
