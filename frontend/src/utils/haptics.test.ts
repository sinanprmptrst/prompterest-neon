import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Web/jsdom environment (Capacitor.isNativePlatform = false) ─────────────

describe('haptics (web/jsdom environment)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => false },
    }));
  });

  it('hapticLight resolves without throwing', async () => {
    const { hapticLight } = await import('./haptics');
    await expect(hapticLight()).resolves.toBeUndefined();
  });

  it('hapticMedium resolves without throwing', async () => {
    const { hapticMedium } = await import('./haptics');
    await expect(hapticMedium()).resolves.toBeUndefined();
  });

  it('hapticHeavy resolves without throwing', async () => {
    const { hapticHeavy } = await import('./haptics');
    await expect(hapticHeavy()).resolves.toBeUndefined();
  });

  it('hapticSelection resolves without throwing', async () => {
    const { hapticSelection } = await import('./haptics');
    await expect(hapticSelection()).resolves.toBeUndefined();
  });
});

// ── Native environment (Capacitor.isNativePlatform = true) ─────────────────

describe('haptics (native environment)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true },
    }));
    vi.doMock('@capacitor/haptics', () => ({
      Haptics: {
        impact: vi.fn().mockResolvedValue(undefined),
        selectionStart: vi.fn().mockResolvedValue(undefined),
        selectionEnd: vi.fn().mockResolvedValue(undefined),
      },
    }));
  });

  it('hapticLight calls Haptics.impact with LIGHT', async () => {
    const { hapticLight } = await import('./haptics');
    const { Haptics } = await import('@capacitor/haptics');
    await hapticLight();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('hapticMedium calls Haptics.impact with MEDIUM', async () => {
    const { hapticMedium } = await import('./haptics');
    const { Haptics } = await import('@capacitor/haptics');
    await hapticMedium();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });

  it('hapticHeavy calls Haptics.impact with HEAVY', async () => {
    const { hapticHeavy } = await import('./haptics');
    const { Haptics } = await import('@capacitor/haptics');
    await hapticHeavy();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
  });

  it('hapticSelection calls selectionStart and selectionEnd', async () => {
    const { hapticSelection } = await import('./haptics');
    const { Haptics } = await import('@capacitor/haptics');
    await hapticSelection();
    expect(Haptics.selectionStart).toHaveBeenCalled();
    expect(Haptics.selectionEnd).toHaveBeenCalled();
  });
});
