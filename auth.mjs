import crypto from 'node:crypto';
const secret = process.env.SESSION_SECRET || '';
export const users = Object.fromEntries(
  (process.env.APP_USERS || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; })
);
const sign = v => crypto.createHmac('sha256', secret).update(v).digest('base64url');
const h = v => crypto.createHash('sha256').update(String(v)).digest();
export const checkPassword = (u, p) => {
  const ok = Object.hasOwn(users, u);
  return crypto.timingSafeEqual(h(p), h(ok ? users[u] : '')) && ok;
};
export const makeCookie = u => {
  const v = u + '|' + (Date.now() + 30 * 864e5);
  return `sid=${encodeURIComponent(v + '|' + sign(v))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;
};
export const clearCookie = () => 'sid=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
export function session(req) {
  if (secret.length < 16) return null;
  const m = (req.headers.get('cookie') || '').match(/(?:^|; )sid=([^;]+)/);
  if (!m) return null;
  const [u, exp, sig] = decodeURIComponent(m[1]).split('|');
  if (!u || !exp || !sig) return null;
  const good = sign(u + '|' + exp);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (+exp < Date.now() || !Object.hasOwn(users, u)) return null;
  return u;
}
