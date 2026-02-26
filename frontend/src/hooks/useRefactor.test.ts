import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefactor } from './useRefactor';
import { useStore } from '../store/useStore';
import type { RefactorResult } from '../types';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, refactorPrompt: vi.fn() };
});

import * as api from '../services/api';

function makeRefactorResult(overrides: Partial<RefactorResult> = {}): RefactorResult {
  return {
    originalPrompt: 'A cinematic sunset',
    segments: [
      {
        id: 's1',
        original: 'cinematic',
        startIndex: 2,
        endIndex: 11,
        reason: 'style enhancement',
        alternatives: [
          { id: 'a1', text: 'dramatic' },
          { id: 'a2', text: 'sweeping' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('useRefactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ applyRefactorResult: vi.fn().mockResolvedValue(undefined) });
  });

  it('starts in idle phase with no result or error', () => {
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.selectedAlts).toEqual({});
  });

  it('startRefactor transitions to active phase with result on success', async () => {
    const mockResult = makeRefactorResult();
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    expect(result.current.phase).toBe('active');
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it('startRefactor sets error and returns to idle on failure', async () => {
    vi.mocked(api.refactorPrompt).mockRejectedValueOnce(new Error('AI service unavailable'));
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toBe('AI service unavailable');
    expect(result.current.result).toBeNull();
  });

  it('selectAlternative records the chosen alternative for a segment', async () => {
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.selectAlternative('s1', 'a1'); });
    expect(result.current.selectedAlts).toEqual({ s1: 'a1' });
  });

  it('selectAlternative can update an already-selected alternative', async () => {
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.selectAlternative('s1', 'a1'); });
    act(() => { result.current.selectAlternative('s1', 'a2'); });
    expect(result.current.selectedAlts['s1']).toBe('a2');
  });

  it('buildModifiedPrompt returns original when no refactor result', () => {
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    expect(result.current.buildModifiedPrompt()).toBe('A cinematic sunset');
  });

  it('buildModifiedPrompt applies selected alternatives to the original prompt', async () => {
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.selectAlternative('s1', 'a1'); });
    // segment replaces 'cinematic' (index 2–11) with 'dramatic' → 'A dramatic sunset'
    expect(result.current.buildModifiedPrompt()).toBe('A dramatic sunset');
  });

  it('buildModifiedPrompt returns original when no alternative is selected', async () => {
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    // no selection made
    expect(result.current.buildModifiedPrompt()).toBe('A cinematic sunset');
  });

  it('resetRefactor returns to idle with cleared state', async () => {
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.resetRefactor(); });
    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.selectedAlts).toEqual({});
  });

  it('applyChanges calls applyRefactorResult with the modified prompt', async () => {
    const applyRefactorResult = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ applyRefactorResult });
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.selectAlternative('s1', 'a1'); });
    await act(async () => { await result.current.applyChanges(); });
    expect(applyRefactorResult).toHaveBeenCalledWith('p1', 'A dramatic sunset');
    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('applyChanges does nothing when modified prompt equals the original', async () => {
    const applyRefactorResult = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ applyRefactorResult });
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    // No alternative selected → modified === original
    await act(async () => { await result.current.applyChanges(); });
    expect(applyRefactorResult).not.toHaveBeenCalled();
  });

  it('applyChanges sets error and returns to active on failure', async () => {
    const applyRefactorResult = vi.fn().mockRejectedValue(new Error('Save failed'));
    useStore.setState({ applyRefactorResult });
    vi.mocked(api.refactorPrompt).mockResolvedValueOnce(makeRefactorResult());
    const { result } = renderHook(() => useRefactor('p1', 'A cinematic sunset'));
    await act(async () => { await result.current.startRefactor(); });
    act(() => { result.current.selectAlternative('s1', 'a1'); });
    await act(async () => { await result.current.applyChanges(); });
    expect(result.current.phase).toBe('active');
    expect(result.current.error).toBe('Save failed');
  });
});
