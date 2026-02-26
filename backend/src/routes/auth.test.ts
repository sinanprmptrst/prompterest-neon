import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authRoutes, verifyToken } from './auth.js';

// DB mock — Neon'a sıfır bağlantı
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from '../db/index.js';

function makeChain(resolvedValue: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolvedValue),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

const app = new Hono();
app.route('/api/auth', authRoutes);

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '',
  avatar: null,
  createdAt: new Date(),
};

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 when fields are missing', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('required');
  });

  it('400 when email already registered', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([mockUser]) as never);
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', username: 'u', password: 'pass' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('already registered');
  });

  it('200 and returns token on success', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never);
    const createdUser = { ...mockUser, email: 'new@example.com', username: 'newuser', passwordHash: 'salt:hash' };
    vi.mocked(db.insert).mockReturnValue(makeChain([createdUser]) as never);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', username: 'newuser', password: 'secret' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { token: string; user: { email: string } };
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('new@example.com');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 when user not found', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@x.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('401 when password is wrong', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('correctpass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };

    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpass' }),
    });
    expect(res.status).toBe(401);
  });

  it('200 and returns token on correct credentials', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('correctpass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };

    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'correctpass' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { token: string };
    expect(data.token).toBeTruthy();
  });
});

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for invalid token', async () => {
    const result = await verifyToken('not-a-real-token');
    expect(result).toBeNull();
  });

  it('returns userId for a valid token', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('pass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };
    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
    });
    const { token } = await res.json() as { token: string };
    const userId = await verifyToken(token);
    expect(userId).toBe(mockUser.id);
  });
});
