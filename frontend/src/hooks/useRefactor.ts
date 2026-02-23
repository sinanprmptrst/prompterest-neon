import { useState, useCallback } from 'react';
import type { RefactorResult, SelectedAlternatives } from '../types';
import { refactorPrompt } from '../services/api';
import { useStore } from '../store/useStore';

export type RefactorPhase = 'idle' | 'loading' | 'active' | 'applying';

interface RefactorState {
  phase: RefactorPhase;
  result: RefactorResult | null;
  selectedAlts: SelectedAlternatives;
  error: string | null;
}

export function useRefactor(promptId: string, originalPrompt: string) {
  const applyRefactorResult = useStore((s) => s.applyRefactorResult);

  const [state, setState] = useState<RefactorState>({
    phase: 'idle',
    result: null,
    selectedAlts: {},
    error: null,
  });

  const startRefactor = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'loading', error: null }));
    try {
      const result = await refactorPrompt(originalPrompt);
      setState({ phase: 'active', result, selectedAlts: {}, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'idle',
        error: err instanceof Error ? err.message : 'Failed to analyze prompt',
      }));
    }
  }, [originalPrompt]);

  const selectAlternative = useCallback(
    (segmentId: string, alternativeId: string) => {
      setState((s) => ({
        ...s,
        selectedAlts: { ...s.selectedAlts, [segmentId]: alternativeId },
      }));
    },
    []
  );

  const buildModifiedPrompt = useCallback((): string => {
    if (!state.result) return originalPrompt;

    // Sort segments by startIndex descending so replacements don't shift indices
    const sortedSegments = [...state.result.segments].sort(
      (a, b) => b.startIndex - a.startIndex
    );

    let modified = originalPrompt;
    for (const segment of sortedSegments) {
      const altId = state.selectedAlts[segment.id];
      if (altId) {
        const alt = segment.alternatives.find((a) => a.id === altId);
        if (alt) {
          modified =
            modified.substring(0, segment.startIndex) +
            alt.text +
            modified.substring(segment.endIndex);
        }
      }
    }
    return modified;
  }, [state.result, state.selectedAlts, originalPrompt]);

  const applyChanges = useCallback(async () => {
    const newPrompt = buildModifiedPrompt();
    if (newPrompt === originalPrompt) return;

    setState((s) => ({ ...s, phase: 'applying' }));
    try {
      await applyRefactorResult(promptId, newPrompt);
      setState({
        phase: 'idle',
        result: null,
        selectedAlts: {},
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'active',
        error: err instanceof Error ? err.message : 'Failed to apply changes',
      }));
    }
  }, [buildModifiedPrompt, originalPrompt, applyRefactorResult, promptId]);

  const resetRefactor = useCallback(() => {
    setState({ phase: 'idle', result: null, selectedAlts: {}, error: null });
  }, []);

  return {
    phase: state.phase,
    result: state.result,
    selectedAlts: state.selectedAlts,
    error: state.error,
    startRefactor,
    selectAlternative,
    buildModifiedPrompt,
    applyChanges,
    resetRefactor,
  };
}
