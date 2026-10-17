import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fstatic from '@fastify/static';
import { config } from './config.js';
import { q } from './db.js';
import { sessionUser } from './lib/auth.js';
import { redact } from './lib/util.js';
import api, { oauthRoutes } from './routes/api.js';
import { authenticateWebhook, receiveWebhook } from './channels/chatwoot-handler.js';
import { queueStats } from './lib/queue.js';

export async function buildApp({ logger = false } = {}) {
  const app = Fastify({ logger, trustProxy: true, bodyLimit: 2 * 1024 * 1024 });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024, files: 20 } });

  const webDist = path.join(config.root, 'web', 'dist');
  await app.register(fstatic, { root: fs.existsSync(webDist) ? webDist : config.root, serve: fs.existsSync(webDist), wildcard: true, decorateReply: true });

  app.addHook('onRequest', async (req) => { req.user = sessionUser(req.cookies?.dos_sid); });
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'same-origin');
    reply.header('x-frame-options', 'DENY');
    reply.header('permissions-policy', 'camera=(), geolocation=()');
    if (!req.url.startsWith('/api') && !req.url.startsWith('/webhooks'))
      reply.header('content-security-policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    return payload;
  });

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode || 500;
    if (status >= 500) req.log?.error?.(redact(err.message));
    reply.status(status).send({ error: redact(err.message) || 'Error' });
  });

  app.get('/healthz', async () => ({ ok: true, db: q.get('SELECT 1 ok').ok === 1, queue: queueStats(), demo: config.demo }));

  // Webhook de Chatwoot: necesita el cuerpo crudo para verificar la firma HMAC.
  await app.register(async (wh) => {
    wh.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => done(null, body));
    const handler = async (req, reply) => {
      const raw = req.body instanceof Buffer ? req.body : Buffer.from('');
      const auth = authenticateWebhook(raw, req.headers, req.params.token);
      if (!auth.ok) return reply.status(auth.status).send({ error: auth.reason });
      let payload;
      try { payload = JSON.parse(raw.toString('utf8')); } catch { return reply.status(400).send({ error: 'JSON inválido' }); }
      return receiveWebhook(raw, payload);
    };
    wh.post('/webhooks/chatwoot', handler);
    wh.post('/webhooks/chatwoot/:token', handler);
  });

  await app.register(api, { prefix: '/api' });
  await app.register(oauthRoutes);

  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && fs.existsSync(path.join(webDist, 'index.html'))) return reply.sendFile('index.html', webDist);
    reply.status(404).send({ error: 'No encontrado' });
  });
  return app;
}
