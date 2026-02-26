export type TabId = 'saved' | 'feed' | 'profile';

// ── Refactor types (unchanged) ───────────────────────────

export interface Alternative {
  id: string;
  text: string;
}

export interface RefactorSegment {
  id: string;
  original: string;
  startIndex: number;
  endIndex: number;
  reason: string;
  alternatives: Alternative[];
}

export interface RefactorResult {
  originalPrompt: string;
  segments: RefactorSegment[];
}

export type SelectedAlternatives = Record<string, string>;
