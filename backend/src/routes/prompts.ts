import { Hono } from 'hono';
import { db } from '../db/index.js';
import { prompts, promptVersions, savedPrompts } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { verifyToken } from './auth.js';

export const promptRoutes = new Hono();

async function getUser(c: any): Promise<string | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// GET /api/prompts — public feed
promptRoutes.get('/', async (c) => {
  const list = await db.select().from(prompts)
    .where(eq(prompts.isPublic, true))
    .orderBy(desc(prompts.createdAt))
    .limit(50);

  const withVersions = await Promise.all(list.map(async (p) => {
    if (!p.currentVersionId) return { ...p, currentVersion: null };
    const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, p.currentVersionId)).limit(1);
    return { ...p, currentVersion: ver ?? null };
  }));

  return c.json(withVersions);
});

// GET /api/prompts/:id
promptRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!prompt) return c.json({ error: 'Not found' }, 404);
  let currentVersion = null;
  if (prompt.currentVersionId) {
    const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, prompt.currentVersionId)).limit(1);
    currentVersion = ver ?? null;
  }
  return c.json({ ...prompt, currentVersion });
});

// POST /api/prompts — create prompt (auth required)
promptRoutes.post('/', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { title, content, imageUrl, tags, isPublic } = await c.req.json();

  const [prompt] = await db.insert(prompts).values({
    userId, title, content, imageUrl, tags: tags ?? [],
    isPublic: isPublic ?? true,
  }).returning();

  const [version] = await db.insert(promptVersions).values({
    promptId: prompt.id, content, imageUrl, versionName: 'v1',
  }).returning();

  const [updated] = await db.update(prompts)
    .set({ currentVersionId: version.id })
    .where(eq(prompts.id, prompt.id))
    .returning();

  return c.json({ ...updated, currentVersion: version }, 201);
});

// GET /api/prompts/:id/versions
promptRoutes.get('/:id/versions', async (c) => {
  const id = c.req.param('id');
  const versions = await db.select().from(promptVersions)
    .where(eq(promptVersions.promptId, id))
    .orderBy(desc(promptVersions.createdAt));
  return c.json(versions);
});

// POST /api/prompts/:id/versions — save new version (auth required)
promptRoutes.post('/:id/versions', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const { content, imageUrl, versionName } = await c.req.json();

  const [version] = await db.insert(promptVersions).values({
    promptId: id, content, imageUrl, versionName,
  }).returning();

  await db.update(prompts).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(prompts.id, id));

  return c.json(version, 201);
});

// GET /api/saved — get saved prompts for logged-in user
promptRoutes.get('/saved/list', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const saved = await db.select().from(savedPrompts)
    .where(eq(savedPrompts.userId, userId))
    .orderBy(desc(savedPrompts.createdAt));

  const withPrompts = await Promise.all(saved.map(async (s) => {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, s.promptId)).limit(1);
    if (!prompt) return null;
    let currentVersion = null;
    if (prompt.currentVersionId) {
      const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, prompt.currentVersionId)).limit(1);
      currentVersion = ver ?? null;
    }
    return { ...s, prompt: { ...prompt, currentVersion } };
  }));

  return c.json(withPrompts.filter(Boolean));
});

// POST /api/prompts/:id/save — toggle save
promptRoutes.post('/:id/save', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const promptId = c.req.param('id');
  const existing = await db.select().from(savedPrompts)
    .where(and(eq(savedPrompts.userId, userId), eq(savedPrompts.promptId, promptId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(savedPrompts).where(eq(savedPrompts.id, existing[0].id));
    return c.json({ saved: false });
  }

  await db.insert(savedPrompts).values({ userId, promptId });
  return c.json({ saved: true });
});
