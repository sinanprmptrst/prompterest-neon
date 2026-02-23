import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { authRoutes } from '../src/routes/auth.js';
import { promptRoutes } from '../src/routes/prompts.js';

export const config = {
  runtime: 'nodejs',
};

const app = new Hono().basePath('/api');

app.use('*', cors({ origin: '*' }));

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({ error: err.message }, 500);
});

app.get('/health', (c) => c.json({ ok: true }));
app.route('/auth', authRoutes);
app.route('/prompts', promptRoutes);

export default handle(app);
