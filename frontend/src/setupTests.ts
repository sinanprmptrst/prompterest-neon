import '@testing-library/jest-dom';
import { vi } from 'vitest';
import type React from 'react';

// ── Capacitor haptics ──────────────────────────────────────
// Not available in jsdom — replace with no-ops
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    selectionStart: vi.fn(),
    selectionChanged: vi.fn(),
    selectionEnd: vi.fn(),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

// ── framer-motion ──────────────────────────────────────────
// Replace animation components with plain HTML equivalents.
// - Renders children correctly so DOM assertions work as expected
// - Filters out framer-motion–specific props to avoid React warnings
// - Filters motion values from style to avoid invalid CSS values
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const { createElement, forwardRef } = React;

  // Props that are framer-motion–only and should not be forwarded to the DOM
  const SKIP_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'whileTap', 'whileHover',
    'whileFocus', 'whileDrag', 'drag', 'dragConstraints', 'dragElastic',
    'dragMomentum', 'dragSnapToOrigin', 'onDragEnd', 'onDragStart',
    'onDrag', 'variants', 'layout', 'layoutId', 'dragListener',
  ]);

  // Motion values expose a .get() method — invalid as CSS values
  const isMotionValue = (v: unknown): boolean =>
    !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).get === 'function';

  const make = (tag: string) =>
    forwardRef<HTMLElement, Record<string, unknown>>(({ style, children, ...rest }, ref) => {
      const domProps: Record<string, unknown> = { ref };
      for (const [k, v] of Object.entries(rest)) {
        if (!SKIP_PROPS.has(k)) domProps[k] = v;
      }
      if (style && typeof style === 'object') {
        const safeStyle: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(style as Record<string, unknown>)) {
          if (!isMotionValue(v)) safeStyle[k] = v;
        }
        if (Object.keys(safeStyle).length > 0) domProps.style = safeStyle;
      }
      return createElement(tag, domProps, children as React.ReactNode);
    });

  return {
    // Proxy so any motion.tag (div, button, p, span, …) is handled automatically
    motion: new Proxy({} as Record<string, unknown>, { get: (_, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform: vi.fn(() => ({ get: () => 0 })),
    useSpring: vi.fn((v: unknown) => v),
    useAnimation: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  };
});
