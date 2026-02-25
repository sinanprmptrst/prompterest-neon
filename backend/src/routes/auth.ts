import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'change-me');

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  return createHash('sha256').update(password + salt).digest('hex') === hash;
}

async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const { email, username, password } = await c.req.json();
  if (!email || !username || !password) {
    return c.json({ error: 'email, username and password required' }, 400);
  }
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return c.json({ error: 'email: already registered' }, 400);

  const [user] = await db.insert(users).values({
    email,
    username,
    passwordHash: hashPassword(password),
  }).returning();

  const token = await createToken(user.id);
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  const token = await createToken(user.id);
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});
