import { describe, it, expect } from 'vitest';
import { getDisplayedVersion } from './useStore';
import type { ApiPrompt, ApiVersion } from '../services/api';

// ── Factories ──────────────────────────────────────────────

function makeVersion(overrides: Partial<ApiVersion> = {}): ApiVersion {
  return {
    id: 'v1',
    promptId: 'p1',
    content: 'A cinematic sunset',
    imageUrl: null,
    versionName: 'v1.0',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePrompt(overrides: Partial<ApiPrompt> = {}): ApiPrompt {
  return {
    id: 'p1',
    userId: 'u1',
    title: 'My Prompt',
    content: 'A cinematic sunset',
    imageUrl: null,
    tags: [],
    isPublic: false,
    currentVersionId: 'v1',
    currentVersion: makeVersion(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── getDisplayedVersion ────────────────────────────────────

describe('getDisplayedVersion', () => {
  it('returns the active version when both activeVersionId and activeVersionData are set', () => {
    const active = makeVersion({ id: 'v2', versionName: 'v2.0' });
    const prompt = makePrompt();
    const result = getDisplayedVersion(prompt, active, 'v2');
    expect(result).toBe(active);
  });

  it('falls back to prompt.currentVersion when activeVersionId is null', () => {
    const prompt = makePrompt();
    const result = getDisplayedVersion(prompt, makeVersion({ id: 'v2' }), null);
    expect(result?.id).toBe('v1');
  });

  it('falls back to prompt.currentVersion when activeVersionData is null', () => {
    const prompt = makePrompt();
    const result = getDisplayedVersion(prompt, null, 'v2');
    expect(result?.id).toBe('v1');
  });

  it('returns null when neither active version nor currentVersion is available', () => {
    const prompt = makePrompt({ currentVersion: null, currentVersionId: null });
    const result = getDisplayedVersion(prompt, null, null);
    expect(result).toBeNull();
  });

  it('returns active version even if prompt also has a currentVersion', () => {
    const active = makeVersion({ id: 'v99', versionName: 'experimental' });
    const prompt = makePrompt(); // has currentVersion v1
    const result = getDisplayedVersion(prompt, active, 'v99');
    expect(result?.id).toBe('v99');
  });
});
