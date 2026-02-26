import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processJsonChar,
  findJsonBounds,
  parseSegmentsFormat1,
  parseSegmentsFormat2,
  parseRawSegments,
  type JsonCharState,
  // Backend API functions
  getToken,
  getStoredUser,
  clearToken,
  apiLogin,
  apiRegister,
  apiLogout,
  fetchPrompts,
  fetchPromptById,
  fetchVersionsForPrompt,
  fetchSavedPrompts,
  toggleSavePrompt,
  createPromptWithVersion,
  createVersion,
} from './api';

// ── processJsonChar ────────────────────────────────────────

describe('processJsonChar', () => {
  it('increments depth on {', () => {
    const state: JsonCharState = { depth: 0, inStr: false, esc: false };
    const done = processJsonChar('{', state);
    expect(state.depth).toBe(1);
    expect(done).toBe(false);
  });

  it('decrements depth on } and returns true when depth reaches 0', () => {
    const state: JsonCharState = { depth: 1, inStr: false, esc: false };
    const done = processJsonChar('}', state);
    expect(state.depth).toBe(0);
    expect(done).toBe(true);
  });

  it('returns false when } decrements depth but it is not yet 0', () => {
    const state: JsonCharState = { depth: 2, inStr: false, esc: false };
    const done = processJsonChar('}', state);
    expect(state.depth).toBe(1);
    expect(done).toBe(false);
  });

  it('toggles inStr on " character', () => {
    const state: JsonCharState = { depth: 1, inStr: false, esc: false };
    processJsonChar('"', state);
    expect(state.inStr).toBe(true);
    processJsonChar('"', state);
    expect(state.inStr).toBe(false);
  });

  it('sets esc flag on backslash', () => {
    const state: JsonCharState = { depth: 1, inStr: true, esc: false };
    processJsonChar('\\', state);
    expect(state.esc).toBe(true);
  });

  it('clears esc flag and does not apply the character logic', () => {
    // When esc=true, the next character is consumed by the escape — no other logic runs
    const state: JsonCharState = { depth: 1, inStr: true, esc: true };
    processJsonChar('"', state);
    expect(state.esc).toBe(false);
    expect(state.inStr).toBe(true); // inStr unchanged: the " was absorbed by the escape
  });

  it('does not change depth for { inside a string', () => {
    const state: JsonCharState = { depth: 1, inStr: true, esc: false };
    processJsonChar('{', state);
    expect(state.depth).toBe(1);
  });

  it('ignores regular characters', () => {
    const state: JsonCharState = { depth: 1, inStr: false, esc: false };
    const done = processJsonChar('a', state);
    expect(done).toBe(false);
    expect(state.depth).toBe(1);
  });
});

// ── findJsonBounds ─────────────────────────────────────────

describe('findJsonBounds', () => {
  it('finds simple JSON object', () => {
    const result = findJsonBounds('{"key":"value"}');
    expect(result).toEqual([0, 14]);
  });

  it('finds JSON with text preamble', () => {
    const result = findJsonBounds('Here is the JSON: {"key":"value"}');
    expect(result).toEqual([18, 32]);
  });

  it('finds nested JSON correctly', () => {
    const text = '{"a":{"b":1}}';
    const result = findJsonBounds(text);
    expect(result).toEqual([0, 12]);
  });

  it('returns null when no JSON object present', () => {
    expect(findJsonBounds('no json here')).toBeNull();
    expect(findJsonBounds('')).toBeNull();
    expect(findJsonBounds('["array"]')).toBeNull();
  });

  it('returns null for unclosed JSON object', () => {
    expect(findJsonBounds('{"unclosed": true')).toBeNull();
  });

  it('handles JSON with quoted braces inside strings', () => {
    const text = '{"key":"value with { and }"}';
    const result = findJsonBounds(text);
    expect(result).toEqual([0, 27]);
  });

  it('handles escaped quotes in strings', () => {
    const text = '{"key":"val\\"ue"}';
    const result = findJsonBounds(text);
    expect(result).not.toBeNull();
    expect(result![0]).toBe(0);
  });
});

// ── parseSegmentsFormat1 ────────────────────────────────────

describe('parseSegmentsFormat1', () => {
  it('parses valid segments array', () => {
    const input = {
      segments: [
        { original: 'a cat', alternatives: ['a dog', 'a bird', 'a fish'] },
        { original: 'running', alternatives: ['jumping', 'sleeping', 'sitting'] },
      ],
    };
    const result = parseSegmentsFormat1(input);
    expect(result).toHaveLength(2);
    expect(result![0].original).toBe('a cat');
    expect(result![0].alternatives).toEqual(['a dog', 'a bird', 'a fish']);
  });

  it('returns null when segments is not an array', () => {
    expect(parseSegmentsFormat1({ segments: 'not an array' })).toBeNull();
    expect(parseSegmentsFormat1({ other: [] })).toBeNull();
    expect(parseSegmentsFormat1({})).toBeNull();
  });

  it('limits to 3 segments', () => {
    const input = {
      segments: [
        { original: 'a', alternatives: ['x'] },
        { original: 'b', alternatives: ['y'] },
        { original: 'c', alternatives: ['z'] },
        { original: 'd', alternatives: ['w'] },
      ],
    };
    const result = parseSegmentsFormat1(input);
    expect(result).toHaveLength(3);
  });

  it('limits alternatives to 3', () => {
    const input = {
      segments: [
        { original: 'phrase', alternatives: ['a1', 'a2', 'a3', 'a4', 'a5'] },
      ],
    };
    const result = parseSegmentsFormat1(input);
    expect(result![0].alternatives).toHaveLength(3);
  });

  it('returns empty array for non-array alternatives', () => {
    const input = {
      segments: [{ original: 'phrase', alternatives: 'not-array' }],
    };
    const result = parseSegmentsFormat1(input);
    expect(result![0].alternatives).toEqual([]);
  });
});

// ── parseSegmentsFormat2 ────────────────────────────────────

describe('parseSegmentsFormat2', () => {
  it('parses key-value format', () => {
    const input = {
      'a cat': ['a dog', 'a bird', 'a fish'],
      'running': ['jumping', 'sleeping', 'sitting'],
    };
    const result = parseSegmentsFormat2(input);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].original).toBe('a cat');
    expect(result![0].alternatives).toEqual(['a dog', 'a bird', 'a fish']);
  });

  it('returns null when no valid key-value pairs', () => {
    expect(parseSegmentsFormat2({})).toBeNull();
    expect(parseSegmentsFormat2({ key: 123 })).toBeNull();
    expect(parseSegmentsFormat2({ key: [] })).toBeNull();
  });

  it('skips entries with non-string array values', () => {
    const input = {
      valid: ['alt1', 'alt2'],
      invalid: [1, 2, 3],
      alsoValid: ['x', 'y'],
    };
    const result = parseSegmentsFormat2(input);
    expect(result).toHaveLength(2);
  });

  it('limits to 3 segments', () => {
    const input = {
      a: ['x'],
      b: ['y'],
      c: ['z'],
      d: ['w'],
    };
    const result = parseSegmentsFormat2(input);
    expect(result).toHaveLength(3);
  });

  it('limits alternatives to 3', () => {
    const input = { phrase: ['a', 'b', 'c', 'd', 'e'] };
    const result = parseSegmentsFormat2(input);
    expect(result![0].alternatives).toHaveLength(3);
  });
});

// ── parseRawSegments ────────────────────────────────────────

describe('parseRawSegments', () => {
  const validJson = '{"segments":[{"original":"a cat","alternatives":["a dog","a bird","a fish"]},{"original":"running","alternatives":["jumping","sleeping","sitting"]},{"original":"sky","alternatives":["clouds","horizon","stars"]}]}';

  it('parses clean JSON', () => {
    const result = parseRawSegments(validJson);
    expect(result).toHaveLength(3);
    expect(result[0].original).toBe('a cat');
  });

  it('strips <think> tags', () => {
    const raw = `<think>let me think about this...</think>${validJson}`;
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });

  it('strips a trailing unclosed <think> block that appears after the JSON', () => {
    // The <think> block starts after the JSON, so JSON survives stripping
    const raw = `${validJson}<think>some trailing reasoning`;
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });

  it('throws when JSON is entirely inside an unclosed <think> block', () => {
    // Everything from <think> to end-of-string is stripped, taking the JSON with it
    const raw = `<think>thinking...${validJson}`;
    expect(() => parseRawSegments(raw)).toThrow('No JSON found');
  });

  it('strips <reasoning> tags', () => {
    const raw = `<reasoning>my reasoning here</reasoning>${validJson}`;
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n' + validJson + '\n```';
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });

  it('strips code fences without language label', () => {
    const raw = '```\n' + validJson + '\n```';
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });

  it('throws when no JSON found', () => {
    expect(() => parseRawSegments('no json here')).toThrow('No JSON found');
  });

  it('throws when JSON has no valid segments', () => {
    expect(() => parseRawSegments('{"totally":"wrong"}')).toThrow();
  });

  it('parses format2 (flat key-value)', () => {
    const raw = '{"a cat":["a dog","a bird","a fish"],"running":["jumping","sleeping","sitting"],"sky":["clouds","horizon","stars"]}';
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
    expect(result[0].original).toBe('a cat');
  });

  it('parses JSON embedded in surrounding text', () => {
    const raw = `Sure! Here is the JSON: ${validJson} Hope that helps!`;
    const result = parseRawSegments(raw);
    expect(result).toHaveLength(3);
  });
});

// ── Backend API functions ────────────────────────────────────

describe('getToken / getStoredUser / clearToken', () => {
  beforeEach(() => localStorage.clear());

  it('getToken returns null when not set', () => {
    expect(getToken()).toBeNull();
  });

  it('getToken returns stored token', () => {
    localStorage.setItem('auth_token', 'mytoken');
    expect(getToken()).toBe('mytoken');
  });

  it('getStoredUser returns null when not set', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('getStoredUser returns parsed user', () => {
    const user = { id: '1', email: 'a@b.com', username: 'u' };
    localStorage.setItem('auth_user', JSON.stringify(user));
    expect(getStoredUser()).toEqual(user);
  });

  it('clearToken removes both keys', () => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', '{}');
    clearToken();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

describe('apiLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores token and returns user on success', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com', username: 'u' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-tok', user: mockUser }),
    }));
    const user = await apiLogin('a@b.com', 'pass');
    expect(user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-tok');
  });

  it('throws on error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    }));
    await expect(apiLogin('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('apiRegister', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores token and returns user on success', async () => {
    const mockUser = { id: 'u1', email: 'new@b.com', username: 'newuser' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-tok', user: mockUser }),
    }));
    const user = await apiRegister('new@b.com', 'pass', 'newuser');
    expect(user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-tok');
  });

  it('uses email prefix as username when username not provided', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', username: 'test' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'tok', user: mockUser }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await apiRegister('test@example.com', 'pass');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string) as { username: string };
    expect(body.username).toBe('test');
  });
});

describe('apiLogout', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('clears token from localStorage', () => {
    localStorage.setItem('auth_token', 'tok');
    apiLogout();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('fetchPrompts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls /api/prompts and returns data', async () => {
    const mockData = [{ id: 'p1', title: 'Test' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));
    const result = await fetchPrompts();
    expect(result).toEqual(mockData);
  });
});

describe('fetchPromptById', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls /api/prompts/:id and returns prompt', async () => {
    const mockData = { id: 'p1', title: 'Test' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));
    const result = await fetchPromptById('p1');
    expect(result).toEqual(mockData);
  });
});

describe('fetchVersionsForPrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns versions array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    const result = await fetchVersionsForPrompt('p1');
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('fetchSavedPrompts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns saved prompts array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    const result = await fetchSavedPrompts();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('toggleSavePrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns saved: true when saving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ saved: true }),
    }));
    const result = await toggleSavePrompt('p1');
    expect(result.saved).toBe(true);
  });

  it('returns saved: false when unsaving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ saved: false }),
    }));
    const result = await toggleSavePrompt('p1');
    expect(result.saved).toBe(false);
  });
});

describe('createPromptWithVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/prompts and returns created prompt', async () => {
    const mockPrompt = { id: 'p1', title: 'T', content: 'C' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPrompt),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await createPromptWithVersion('T', 'C');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/prompts');
    expect((opts as RequestInit).method).toBe('POST');
    expect(result).toEqual(mockPrompt);
  });
});

describe('createVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/prompts/:id/versions', async () => {
    const mockVersion = { id: 'v2', content: 'updated' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVersion),
    }));
    const result = await createVersion('p1', 'updated', 'v2');
    expect(result).toEqual(mockVersion);
  });
});
