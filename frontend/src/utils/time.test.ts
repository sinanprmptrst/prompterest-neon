import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRelativeTime, formatFullDate } from './time';

// Fix "now" so tests don't depend on the actual wall clock
const FIXED_NOW = new Date('2026-02-26T12:00:00.000Z');

describe('getRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(FIXED_NOW.getTime() - ms).toISOString();

  it('returns "just now" for times within the last minute', () => {
    expect(getRelativeTime(ago(30_000))).toBe('just now');
    expect(getRelativeTime(ago(59_000))).toBe('just now');
  });

  it('returns minutes ago for 1–59 minutes', () => {
    expect(getRelativeTime(ago(60_000))).toBe('1m ago');
    expect(getRelativeTime(ago(5 * 60_000))).toBe('5m ago');
    expect(getRelativeTime(ago(59 * 60_000))).toBe('59m ago');
  });

  it('returns hours ago for 1–23 hours', () => {
    expect(getRelativeTime(ago(60 * 60_000))).toBe('1h ago');
    expect(getRelativeTime(ago(3 * 60 * 60_000))).toBe('3h ago');
    expect(getRelativeTime(ago(23 * 60 * 60_000))).toBe('23h ago');
  });

  it('returns days ago for 1–6 days', () => {
    expect(getRelativeTime(ago(24 * 60 * 60_000))).toBe('1d ago');
    expect(getRelativeTime(ago(6 * 24 * 60 * 60_000))).toBe('6d ago');
  });

  it('returns weeks ago for 1–4 weeks', () => {
    expect(getRelativeTime(ago(7 * 24 * 60 * 60_000))).toBe('1w ago');
    expect(getRelativeTime(ago(4 * 7 * 24 * 60 * 60_000))).toBe('4w ago');
  });

  it('returns months ago beyond 5 weeks', () => {
    // 5+ weeks → months
    expect(getRelativeTime(ago(40 * 24 * 60 * 60_000))).toMatch(/mo ago$/);
  });
});

describe('formatFullDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatFullDate('2026-02-26T12:00:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('includes the year', () => {
    expect(formatFullDate('2026-01-15T10:00:00.000Z')).toContain('2026');
  });

  it('produces different strings for different dates', () => {
    const d1 = formatFullDate('2026-01-01T00:00:00.000Z');
    const d2 = formatFullDate('2026-06-15T00:00:00.000Z');
    expect(d1).not.toBe(d2);
  });
});
