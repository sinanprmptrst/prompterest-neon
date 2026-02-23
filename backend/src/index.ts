import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { promptRoutes } from './routes/prompts';

const app = new Hono();

app.use('*', cors({ origin: '*' }));

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({ error: err.message }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/auth', authRoutes);
app.route('/api/prompts', promptRoutes);

const port = Number(process.env.PORT) || 3000;
console.log(`Server running on port ${port}`);

serve({ fetch: app.fetch, port });
