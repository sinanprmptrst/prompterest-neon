// ── PocketBase-aligned types ──────────────────────────────

export interface PBRecord {
  id: string;
  created: string;
  updated: string;
}

export interface PromptVersion extends PBRecord {
  prompt: string;       // relation → prompts.id
  content: string;
  versionName: string;
  createdBy: string;    // relation → users.id
  image: string;        // file field name
}

export interface Prompt extends PBRecord {
  title: string;
  tags: string[];
  category: string;        // relation → categories.id
  owner: string;           // relation → users.id
  currentVersion: string;  // relation → prompt_versions.id

  // expanded fields (populated after fetch)
  expand?: {
    currentVersion?: PromptVersion;
    category?: Category;
  };
}

export interface Category extends PBRecord {
  name: string;
}

export interface SavedPrompt extends PBRecord {
  user: string;     // relation → users.id
  prompt: string;   // relation → prompts.id

  expand?: {
    prompt?: Prompt & {
      expand?: {
        currentVersion?: PromptVersion;
      };
    };
  };
}

export interface User extends PBRecord {
  email: string;
  name: string;
  avatar: string;
  verified: boolean;
}

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
