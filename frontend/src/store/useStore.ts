import { create } from 'zustand';
import type { TabId } from '../types';
import {
  apiLogin, apiRegister, apiLogout, getStoredUser,
  fetchPrompts, fetchPromptById, fetchVersionsForPrompt,
  fetchSavedPrompts, toggleSavePrompt,
  createPromptWithVersion, createVersion,
  type AuthUser, type ApiPrompt, type ApiVersion, type ApiSaved,
} from '../services/api';

interface AppState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  user: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  initAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  prompts: ApiPrompt[];
  feedLoading: boolean;
  currentFeedIndex: number;
  activeVersionId: string | null;
  loadPrompts: () => Promise<void>;
  setCurrentFeedIndex: (index: number) => void;
  setActiveVersionId: (id: string | null) => void;
  navigateToPrompt: (promptId: string) => void;
  activeVersionData: ApiVersion | null;
  loadActiveVersion: (versionId: string, promptId: string) => Promise<void>;
  versionHistory: ApiVersion[];
  historyLoading: boolean;
  loadVersionHistory: (promptId: string) => Promise<void>;
  savedPrompts: ApiSaved[];
  savedLoading: boolean;
  savedPromptIds: Set<string>;
  loadSavedPrompts: () => Promise<void>;
  toggleSave: (promptId: string) => Promise<void>;
  applyRefactorResult: (promptId: string, newContent: string, imageUrl?: string) => Promise<void>;
  editorPromptId: string | null;
  openEditor: (promptId: string) => void;
  closeEditor: () => void;
  newPromptOpen: boolean;
  openNewPrompt: () => void;
  closeNewPrompt: () => void;
  createNewPrompt: (title: string, content: string, tags: string[], imageUrl?: string) => Promise<void>;
}

export const useStore = create<AppState>()((set, get) => ({
  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),

  user: null,
  authLoading: false,
  authError: null,

  initAuth: () => {
    const stored = getStoredUser();
    if (stored) { set({ user: stored }); get().loadSavedPrompts(); }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const user = await apiLogin(email, password);
      set({ authLoading: false, user });
      get().loadSavedPrompts();
    } catch (err) {
      set({ authLoading: false, authError: err instanceof Error ? err.message : 'Login failed' });
    }
  },

  register: async (email, password, name) => {
    set({ authLoading: true, authError: null });
    try {
      const user = await apiRegister(email, password, name);
      set({ authLoading: false, user });
      get().loadSavedPrompts();
    } catch (err) {
      set({ authLoading: false, authError: err instanceof Error ? err.message : 'Register failed' });
    }
  },

  logout: () => {
    apiLogout();
    set({ user: null, savedPrompts: [], savedPromptIds: new Set(), authError: null });
  },

  prompts: [],
  feedLoading: false,
  currentFeedIndex: 0,
  activeVersionId: null,

  loadPrompts: async () => {
    set({ feedLoading: true });
    try {
      const prompts = await fetchPrompts();
      set({ prompts, feedLoading: false });
    } catch (err) {
      console.error('[Store] loadPrompts:', err);
      set({ feedLoading: false });
    }
  },

  setCurrentFeedIndex: (index) => set({ currentFeedIndex: index, activeVersionId: null, activeVersionData: null }),

  setActiveVersionId: (id) => {
    if (id) {
      set({ activeVersionId: id });
      const { prompts, currentFeedIndex } = get();
      const prompt = prompts[currentFeedIndex];
      if (prompt) get().loadActiveVersion(id, prompt.id);
    } else {
      set({ activeVersionId: null, activeVersionData: null });
    }
  },

  navigateToPrompt: (promptId) => {
    const index = get().prompts.findIndex((p) => p.id === promptId);
    if (index >= 0) {
      set({ currentFeedIndex: index, activeTab: 'feed', activeVersionId: null, activeVersionData: null });
    } else {
      fetchPromptById(promptId).then((prompt) => {
        set({ prompts: [prompt, ...get().prompts.filter((p) => p.id !== promptId)], currentFeedIndex: 0, activeTab: 'feed', activeVersionId: null, activeVersionData: null });
      });
    }
  },

  activeVersionData: null,
  loadActiveVersion: async (versionId, promptId) => {
    try {
      const versions = await fetchVersionsForPrompt(promptId);
      set({ activeVersionData: versions.find((v) => v.id === versionId) ?? null });
    } catch (err) { console.error('[Store] loadActiveVersion:', err); }
  },

  versionHistory: [],
  historyLoading: false,
  loadVersionHistory: async (promptId) => {
    set({ historyLoading: true });
    try {
      const versions = await fetchVersionsForPrompt(promptId);
      set({ versionHistory: versions, historyLoading: false });
    } catch (err) {
      console.error('[Store] loadVersionHistory:', err);
      set({ historyLoading: false });
    }
  },

  savedPrompts: [],
  savedLoading: false,
  savedPromptIds: new Set(),
  loadSavedPrompts: async () => {
    if (!get().user) return;
    set({ savedLoading: true });
    try {
      const items = await fetchSavedPrompts();
      set({ savedPrompts: items, savedPromptIds: new Set(items.map((s) => s.promptId)), savedLoading: false });
    } catch (err) {
      console.error('[Store] loadSavedPrompts:', err);
      set({ savedLoading: false });
    }
  },

  toggleSave: async (promptId) => {
    if (!get().user) return;
    const { savedPromptIds, savedPrompts } = get();
    const wasSaved = savedPromptIds.has(promptId);
    const newIds = new Set(savedPromptIds);
    if (wasSaved) {
      newIds.delete(promptId);
      set({ savedPromptIds: newIds, savedPrompts: savedPrompts.filter((s) => s.promptId !== promptId) });
    } else {
      newIds.add(promptId);
      set({ savedPromptIds: newIds });
    }
    try {
      await toggleSavePrompt(promptId);
      if (!wasSaved) get().loadSavedPrompts();
    } catch (err) {
      if (wasSaved) newIds.add(promptId); else newIds.delete(promptId);
      set({ savedPromptIds: new Set(newIds) });
      console.error('[Store] toggleSave failed:', err);
    }
  },

  applyRefactorResult: async (promptId, newContent, imageUrl) => {
    const { user, prompts, versionHistory } = get();
    if (!user) throw new Error('Login required to save a version');
    const versionName = 'v' + (versionHistory.length + 1);
    const newVersion = await createVersion(promptId, newContent, versionName, imageUrl);
    set({ prompts: prompts.map((p) => p.id !== promptId ? p : { ...p, currentVersionId: newVersion.id, currentVersion: newVersion }), activeVersionId: null, activeVersionData: null });
  },

  editorPromptId: null,
  openEditor: (promptId) => set({ editorPromptId: promptId }),
  closeEditor: () => set({ editorPromptId: null }),

  newPromptOpen: false,
  openNewPrompt: () => set({ newPromptOpen: true }),
  closeNewPrompt: () => set({ newPromptOpen: false }),
  createNewPrompt: async (title, content, tags, imageUrl) => {
    if (!get().user) return;
    const newPrompt = await createPromptWithVersion(title, content, imageUrl, tags);
    set({ prompts: [newPrompt, ...get().prompts] });
  },
}));

export const useCurrentPrompt = () => useStore((s) => s.prompts[s.currentFeedIndex] ?? null);
export const useIsPromptSaved = (promptId: string) => useStore((s) => s.savedPromptIds.has(promptId));

export function getDisplayedVersion(
  prompt: ApiPrompt,
  activeVersionData: ApiVersion | null,
  activeVersionId: string | null
): ApiVersion | null {
  if (activeVersionId && activeVersionData) return activeVersionData;
  return prompt.currentVersion ?? null;
}
