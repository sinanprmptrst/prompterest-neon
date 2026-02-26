import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { promptRoutes } from './prompts.js';
import { SignJWT } from 'jose';

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../db/index.js';

process.env.JWT_SECRET = 'change-me';
const JWT_SECRET = new TextEncoder().encode('change-me');

async function makeToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

// Thenable chain: supports both .limit()/.orderBy() as terminators and chaining between them.
function makeSelectChain(value: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain['from'] = vi.fn().mockReturnValue(chain);
  chain['where'] = vi.fn().mockReturnValue(chain);
  chain['orderBy'] = vi.fn().mockReturnValue(chain);
  chain['limit'] = vi.fn().mockResolvedValue(value);
  // Make the chain itself awaitable so routes that end with .orderBy() work correctly.
  chain['then'] = (resolve: (v: unknown) => unknown) => Promise.resolve(value).then(resolve);
  chain['catch'] = (reject: (e: unknown) => unknown) => Promise.resolve(value).catch(reject);
  chain['finally'] = (onFinally: (() => void) | null | undefined) => Promise.resolve(value).finally(onFinally);
  return chain;
}

function makeInsertChain(value: unknown[]) {
  return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue(value) };
}

function makeUpdateChain(value: unknown[]) {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue(value) };
}

function makeDeleteChain() {
  return { where: vi.fn().mockResolvedValue(undefined) };
}

const app = new Hono();
app.route('/api/prompts', promptRoutes);

const mockVersion = { id: 'v1', promptId: 'p1', content: 'test content', imageUrl: null, versionName: 'v1', createdAt: new Date() };
const mockPrompt = { id: 'p1', userId: 'u1', title: 'Test', content: 'test content', imageUrl: null, tags: [], isPublic: true, currentVersionId: 'v1', createdAt: new Date(), updatedAt: new Date() };
const mockSaved = { id: 's1', userId: 'u1', promptId: 'p1', createdAt: new Date() };

describe('GET /api/prompts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns public prompts list', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPrompt]) as never)
      .mockReturnValueOnce(makeSelectChain([mockVersion]) as never);
    const res = await app.request('/api/prompts');
    expect(res.status).toBe(200);
    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('GET /api/prompts/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('404 when prompt not found', async () => {
    vi.mocked(db.select).mockReturnValue(makeSelectChain([]) as never);
    const res = await app.request('/api/prompts/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns prompt with version', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockPrompt]) as never)
      .mockReturnValueOnce(makeSelectChain([mockVersion]) as never);
    const res = await app.request('/api/prompts/p1');
    expect(res.status).toBe(200);
    const data = await res.json() as { id: string };
    expect(data.id).toBe('p1');
  });
});

describe('POST /api/prompts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 when no auth token', async () => {
    const res = await app.request('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', content: 'C' }),
    });
    expect(res.status).toBe(401);
  });

  it('201 creates prompt with version', async () => {
    const token = await makeToken('u1');
    vi.mocked(db.insert)
      .mockReturnValueOnce(makeInsertChain([mockPrompt]) as never)
      .mockReturnValueOnce(makeInsertChain([mockVersion]) as never);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain([{ ...mockPrompt, currentVersionId: 'v1' }]) as never);

    const res = await app.request('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Test', content: 'test content' }),
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/prompts/:id/versions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns versions array', async () => {
    vi.mocked(db.select).mockReturnValue(makeSelectChain([mockVersion]) as never);
    const res = await app.request('/api/prompts/p1/versions');
    expect(res.status).toBe(200);
    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/prompts/:id/versions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 when not authenticated', async () => {
    const res = await app.request('/api/prompts/p1/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'new', versionName: 'v2' }),
    });
    expect(res.status).toBe(401);
  });

  it('201 creates version', async () => {
    const token = await makeToken('u1');
    vi.mocked(db.insert).mockReturnValue(makeInsertChain([mockVersion]) as never);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain([mockPrompt]) as never);

    const res = await app.request('/api/prompts/p1/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'updated content', versionName: 'v2' }),
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/prompts/saved/list', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 when not authenticated', async () => {
    const res = await app.request('/api/prompts/saved/list');
    expect(res.status).toBe(401);
  });

  it('returns saved prompts for user', async () => {
    const token = await makeToken('u1');
    vi.mocked(db.select)
      .mockReturnValueOnce(makeSelectChain([mockSaved]) as never)
      .mockReturnValueOnce(makeSelectChain([mockPrompt]) as never)
      .mockReturnValueOnce(makeSelectChain([mockVersion]) as never);
    const res = await app.request('/api/prompts/saved/list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/prompts/:id/save', () => {
  beforeEach(() => vi.resetAllMocks());

  it('401 when not authenticated', async () => {
    const res = await app.request('/api/prompts/p1/save', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('saves prompt when not yet saved', async () => {
    const token = await makeToken('u1');
    vi.mocked(db.select).mockReturnValue(makeSelectChain([]) as never);
    vi.mocked(db.insert).mockReturnValue(makeInsertChain([mockSaved]) as never);

    const res = await app.request('/api/prompts/p1/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { saved: boolean };
    expect(data.saved).toBe(true);
  });

  it('unsaves prompt when already saved', async () => {
    const token = await makeToken('u1');
    vi.mocked(db.select).mockReturnValue(makeSelectChain([mockSaved]) as never);
    vi.mocked(db.delete).mockReturnValue(makeDeleteChain() as never);

    const res = await app.request('/api/prompts/p1/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { saved: boolean };
    expect(data.saved).toBe(false);
  });
});
