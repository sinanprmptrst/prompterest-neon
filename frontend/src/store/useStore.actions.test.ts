import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { ApiPrompt, ApiSaved, ApiVersion } from '../services/api';

// ── Mock all API functions used by the store ────────────────────────────────
vi.mock('../services/api', () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiLogout: vi.fn(),
  getStoredUser: vi.fn().mockReturnValue(null),
  fetchPrompts: vi.fn().mockResolvedValue([]),
  fetchPromptById: vi.fn(),
  fetchVersionsForPrompt: vi.fn().mockResolvedValue([]),
  fetchSavedPrompts: vi.fn().mockResolvedValue([]),
  toggleSavePrompt: vi.fn().mockResolvedValue({ saved: true }),
  createPromptWithVersion: vi.fn(),
  createVersion: vi.fn(),
}));

// ── Factories ───────────────────────────────────────────────────────────────
function makeUser() {
  return { id: 'u1', email: 'test@test.com', username: 'Test User' };
}

function makeVersion(overrides: Partial<ApiVersion> = {}): ApiVersion {
  return {
    id: 'v1', promptId: 'p1', content: 'A cinematic sunset',
    imageUrl: null, versionName: 'v1.0', createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePrompt(overrides: Partial<ApiPrompt> = {}): ApiPrompt {
  return {
    id: 'p1', userId: 'u1', title: 'My Prompt', content: 'A cinematic sunset',
    imageUrl: null, tags: [], isPublic: false,
    currentVersionId: 'v1', currentVersion: makeVersion(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSaved(overrides: Partial<ApiSaved> = {}): ApiSaved {
  return {
    id: 's1', userId: 'u1', promptId: 'p1', createdAt: new Date().toISOString(),
    prompt: makePrompt(),
    ...overrides,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Import the real mocked api so we can configure return values per test
import * as api from '../services/api';

const RESET_STATE = {
  activeTab: 'feed' as const,
  user: null,
  authLoading: false,
  authError: null,
  prompts: [],
  feedLoading: false,
  currentFeedIndex: 0,
  activeVersionId: null,
  activeVersionData: null,
  versionHistory: [],
  historyLoading: false,
  savedPrompts: [],
  savedLoading: false,
  savedPromptIds: new Set<string>(),
  editorPromptId: null,
  newPromptOpen: false,
};

describe('useStore — tab and UI navigation', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('setActiveTab changes the active tab', () => {
    useStore.getState().setActiveTab('saved');
    expect(useStore.getState().activeTab).toBe('saved');
  });

  it('openEditor sets editorPromptId', () => {
    useStore.getState().openEditor('prompt-123');
    expect(useStore.getState().editorPromptId).toBe('prompt-123');
  });

  it('closeEditor clears editorPromptId', () => {
    useStore.setState({ editorPromptId: 'prompt-123' });
    useStore.getState().closeEditor();
    expect(useStore.getState().editorPromptId).toBeNull();
  });

  it('openNewPrompt sets newPromptOpen to true', () => {
    useStore.getState().openNewPrompt();
    expect(useStore.getState().newPromptOpen).toBe(true);
  });

  it('closeNewPrompt sets newPromptOpen to false', () => {
    useStore.setState({ newPromptOpen: true });
    useStore.getState().closeNewPrompt();
    expect(useStore.getState().newPromptOpen).toBe(false);
  });

  it('setCurrentFeedIndex updates index and clears active version state', () => {
    useStore.setState({ currentFeedIndex: 5, activeVersionId: 'v1', activeVersionData: makeVersion() });
    useStore.getState().setCurrentFeedIndex(2);
    const s = useStore.getState();
    expect(s.currentFeedIndex).toBe(2);
    expect(s.activeVersionId).toBeNull();
    expect(s.activeVersionData).toBeNull();
  });

  it('setActiveVersionId with null clears both version fields', () => {
    useStore.setState({ activeVersionId: 'v1', activeVersionData: makeVersion() });
    useStore.getState().setActiveVersionId(null);
    expect(useStore.getState().activeVersionId).toBeNull();
    expect(useStore.getState().activeVersionData).toBeNull();
  });
});

describe('useStore — auth actions', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('initAuth with a stored user sets user in state', () => {
    const user = makeUser();
    vi.mocked(api.getStoredUser).mockReturnValueOnce(user);
    vi.mocked(api.fetchSavedPrompts).mockResolvedValue([]);
    useStore.getState().initAuth();
    expect(useStore.getState().user).toEqual(user);
  });

  it('initAuth with no stored user leaves user null', () => {
    vi.mocked(api.getStoredUser).mockReturnValueOnce(null);
    useStore.getState().initAuth();
    expect(useStore.getState().user).toBeNull();
  });

  it('login success sets user and clears authLoading', async () => {
    const user = makeUser();
    vi.mocked(api.apiLogin).mockResolvedValueOnce(user);
    vi.mocked(api.fetchSavedPrompts).mockResolvedValue([]);
    await useStore.getState().login('test@test.com', 'password');
    const s = useStore.getState();
    expect(s.user).toEqual(user);
    expect(s.authLoading).toBe(false);
    expect(s.authError).toBeNull();
  });

  it('login failure sets authError and leaves user null', async () => {
    vi.mocked(api.apiLogin).mockRejectedValueOnce(new Error('Invalid credentials'));
    await useStore.getState().login('test@test.com', 'wrong');
    const s = useStore.getState();
    expect(s.authError).toBe('Invalid credentials');
    expect(s.user).toBeNull();
    expect(s.authLoading).toBe(false);
  });

  it('register success sets user', async () => {
    const user = makeUser();
    vi.mocked(api.apiRegister).mockResolvedValueOnce(user);
    vi.mocked(api.fetchSavedPrompts).mockResolvedValue([]);
    await useStore.getState().register('new@test.com', 'password', 'Test User');
    expect(useStore.getState().user).toEqual(user);
  });

  it('register failure sets authError', async () => {
    vi.mocked(api.apiRegister).mockRejectedValueOnce(new Error('Email already taken'));
    await useStore.getState().register('taken@test.com', 'password');
    expect(useStore.getState().authError).toBe('Email already taken');
    expect(useStore.getState().user).toBeNull();
  });

  it('logout clears user, savedPrompts, and savedPromptIds', () => {
    useStore.setState({
      user: makeUser(),
      savedPrompts: [makeSaved()],
      savedPromptIds: new Set(['p1']),
    });
    useStore.getState().logout();
    const s = useStore.getState();
    expect(s.user).toBeNull();
    expect(s.savedPrompts).toHaveLength(0);
    expect(s.savedPromptIds.size).toBe(0);
    expect(api.apiLogout).toHaveBeenCalledTimes(1);
  });
});

describe('useStore — data loading', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('loadPrompts success populates prompts and clears feedLoading', async () => {
    const prompts = [makePrompt()];
    vi.mocked(api.fetchPrompts).mockResolvedValueOnce(prompts);
    await useStore.getState().loadPrompts();
    const s = useStore.getState();
    expect(s.prompts).toEqual(prompts);
    expect(s.feedLoading).toBe(false);
  });

  it('loadPrompts failure clears feedLoading without throwing', async () => {
    vi.mocked(api.fetchPrompts).mockRejectedValueOnce(new Error('Network error'));
    await useStore.getState().loadPrompts();
    expect(useStore.getState().feedLoading).toBe(false);
  });

  it('loadVersionHistory populates versionHistory and clears historyLoading', async () => {
    const versions = [makeVersion({ id: 'v1' }), makeVersion({ id: 'v2', versionName: 'v2.0' })];
    vi.mocked(api.fetchVersionsForPrompt).mockResolvedValueOnce(versions);
    await useStore.getState().loadVersionHistory('p1');
    const s = useStore.getState();
    expect(s.versionHistory).toEqual(versions);
    expect(s.historyLoading).toBe(false);
  });

  it('loadVersionHistory failure clears historyLoading', async () => {
    vi.mocked(api.fetchVersionsForPrompt).mockRejectedValueOnce(new Error('Not found'));
    await useStore.getState().loadVersionHistory('p1');
    expect(useStore.getState().historyLoading).toBe(false);
  });
});

describe('useStore — saved prompts', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('toggleSave adds promptId to savedPromptIds when not already saved', async () => {
    useStore.setState({ user: makeUser(), savedPromptIds: new Set(), savedPrompts: [] });
    vi.mocked(api.toggleSavePrompt).mockResolvedValueOnce({ saved: true });
    vi.mocked(api.fetchSavedPrompts).mockResolvedValue([makeSaved()]);
    await useStore.getState().toggleSave('p1');
    expect(useStore.getState().savedPromptIds.has('p1')).toBe(true);
  });

  it('toggleSave removes promptId from savedPromptIds when already saved', async () => {
    const savedItem = makeSaved();
    useStore.setState({
      user: makeUser(),
      savedPromptIds: new Set(['p1']),
      savedPrompts: [savedItem],
    });
    vi.mocked(api.toggleSavePrompt).mockResolvedValueOnce({ saved: false });
    await useStore.getState().toggleSave('p1');
    const s = useStore.getState();
    expect(s.savedPromptIds.has('p1')).toBe(false);
    expect(s.savedPrompts).toHaveLength(0);
  });

  it('toggleSave does nothing when user is not logged in', async () => {
    useStore.setState({ user: null });
    await useStore.getState().toggleSave('p1');
    expect(api.toggleSavePrompt).not.toHaveBeenCalled();
  });
});

describe('useStore — prompt creation', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('createNewPrompt prepends the new prompt to the list', async () => {
    const existingPrompt = makePrompt({ id: 'existing' });
    const newPrompt = makePrompt({ id: 'new-p1', title: 'Brand New' });
    useStore.setState({ user: makeUser(), prompts: [existingPrompt] });
    vi.mocked(api.createPromptWithVersion).mockResolvedValueOnce(newPrompt);
    await useStore.getState().createNewPrompt('Brand New', 'content', []);
    const prompts = useStore.getState().prompts;
    expect(prompts[0]).toEqual(newPrompt);
    expect(prompts[1]).toEqual(existingPrompt);
  });

  it('createNewPrompt does nothing when user is not logged in', async () => {
    useStore.setState({ user: null });
    await useStore.getState().createNewPrompt('title', 'content', []);
    expect(api.createPromptWithVersion).not.toHaveBeenCalled();
  });
});

describe('useStore — version management', () => {
  beforeEach(() => {
    useStore.setState(RESET_STATE);
    vi.clearAllMocks();
  });

  it('setActiveVersionId with non-null id sets activeVersionId and triggers version load', async () => {
    const prompt = makePrompt({ id: 'p1' });
    const version = makeVersion({ id: 'v1' });
    useStore.setState({ prompts: [prompt], currentFeedIndex: 0 });
    vi.mocked(api.fetchVersionsForPrompt).mockResolvedValueOnce([version]);
    useStore.getState().setActiveVersionId('v1');
    expect(useStore.getState().activeVersionId).toBe('v1');
    // Wait for the async loadActiveVersion to complete
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(useStore.getState().activeVersionData).toEqual(version);
  });

  it('applyRefactorResult creates a new version and updates the prompt in the store', async () => {
    const prompt = makePrompt({ id: 'p1' });
    const newVersion = makeVersion({ id: 'v2', content: 'New content', versionName: 'v1' });
    useStore.setState({ user: makeUser(), prompts: [prompt], versionHistory: [] });
    vi.mocked(api.createVersion).mockResolvedValueOnce(newVersion);
    await useStore.getState().applyRefactorResult('p1', 'New content');
    const updated = useStore.getState().prompts.find((p) => p.id === 'p1');
    expect(updated?.currentVersionId).toBe('v2');
    expect(updated?.currentVersion).toEqual(newVersion);
    expect(useStore.getState().activeVersionId).toBeNull();
  });

  it('applyRefactorResult throws when user is not logged in', async () => {
    useStore.setState({ user: null });
    await expect(
      useStore.getState().applyRefactorResult('p1', 'new content')
    ).rejects.toThrow('Login required');
  });

  it('loadVersionHistory failure clears historyLoading', async () => {
    vi.mocked(api.fetchVersionsForPrompt).mockRejectedValueOnce(new Error('Not found'));
    await useStore.getState().loadVersionHistory('p1');
    expect(useStore.getState().historyLoading).toBe(false);
  });

  it('navigateToPrompt switches to the prompt by index when it exists', () => {
    const p1 = makePrompt({ id: 'p1' });
    const p2 = makePrompt({ id: 'p2' });
    useStore.setState({ prompts: [p1, p2], currentFeedIndex: 0 });
    useStore.getState().navigateToPrompt('p2');
    const s = useStore.getState();
    expect(s.currentFeedIndex).toBe(1);
    expect(s.activeTab).toBe('feed');
  });
});
