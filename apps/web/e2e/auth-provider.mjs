// Isolated test-only upstream. The application uses the real Neon SDK against this server.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const sessions = new Map([['fixture', 'one@example.com'], ['partner', 'two@example.com']]);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost:3200').pathname;
  const token = /__Secure-neon-auth.session_token=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
  const payload = email => ({ user: { id: email, email, emailVerified: true }, session: { id: 'test', expiresAt: new Date(Date.now() + 3600000).toISOString() } });
  res.setHeader('Content-Type', 'application/json');
  if (path === '/get-session') return res.end(JSON.stringify(sessions.has(token) ? payload(sessions.get(token)) : null));
  if (path === '/email-otp/send-verification-otp') return res.end('{}');
  if (path === '/sign-out') {
    sessions.delete(token); res.setHeader('Set-Cookie', '__Secure-neon-auth.session_token=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0'); return res.end('{}');
  }
  if (path === '/sign-in/email-otp') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.otp !== '123456') { res.statusCode = 401; return res.end('{}'); }
    const key = randomUUID(); sessions.set(key, body.email);
    res.setHeader('Set-Cookie', `__Secure-neon-auth.session_token=${key}; Path=/; Secure; HttpOnly; SameSite=Lax`);
    return res.end(JSON.stringify(payload(body.email)));
  }
  res.end('{}');
});
server.listen(3200, 'localhost');
