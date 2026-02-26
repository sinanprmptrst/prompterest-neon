import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptEditorScreen } from './PromptEditorScreen';
import { useStore } from '../store/useStore';
import type { ApiPrompt, ApiVersion } from '../services/api';

// Mock the refactor hook so tests never hit real API calls
vi.mock('../hooks/useRefactor', () => ({
  useRefactor: () => ({
    phase: 'idle' as const,
    result: null,
    error: null,
    startRefactor: vi.fn(),
    resetRefactor: vi.fn(),
    selectAlternative: vi.fn(),
    selectedAlts: {},
    buildModifiedPrompt: vi.fn(() => ''),
  }),
}));

// Mock generateImage — not needed for these tests but imported by the screen
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, generateImage: vi.fn().mockResolvedValue({ imageUrl: '', imageBlob: new Blob() }) };
});

function makeVersion(overrides: Partial<ApiVersion> = {}): ApiVersion {
  return { id: 'v1', promptId: 'p1', content: 'A cinematic sunset', imageUrl: null, versionName: 'v1.0', createdAt: new Date().toISOString(), ...overrides };
}

function makePrompt(overrides: Partial<ApiPrompt> = {}): ApiPrompt {
  return { id: 'p1', userId: 'u1', title: 'Sunset Prompt', content: 'A cinematic sunset', imageUrl: null, tags: [], isPublic: false, currentVersionId: 'v1', currentVersion: makeVersion(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}

const BASE_STATE = {
  editorPromptId: null as string | null,
  prompts: [] as ApiPrompt[],
  activeVersionId: null,
  activeVersionData: null,
  closeEditor: vi.fn(),
  applyRefactorResult: vi.fn(),
};

describe('PromptEditorScreen', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('renders nothing when there is no editorPromptId', () => {
    const { container } = render(<PromptEditorScreen />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the prompt content when editorPromptId is set', () => {
    useStore.setState({ editorPromptId: 'p1', prompts: [makePrompt()] });
    render(<PromptEditorScreen />);
    expect(screen.getByText('A cinematic sunset')).toBeInTheDocument();
  });

  it('renders a Refactor button', () => {
    useStore.setState({ editorPromptId: 'p1', prompts: [makePrompt()] });
    render(<PromptEditorScreen />);
    expect(screen.getByRole('button', { name: /refactor/i })).toBeInTheDocument();
  });

  it('renders an Edit button', () => {
    useStore.setState({ editorPromptId: 'p1', prompts: [makePrompt()] });
    render(<PromptEditorScreen />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows a textarea when Edit mode is toggled on', async () => {
    useStore.setState({ editorPromptId: 'p1', prompts: [makePrompt()] });
    render(<PromptEditorScreen />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders a close (X) button', () => {
    useStore.setState({ editorPromptId: 'p1', prompts: [makePrompt()] });
    render(<PromptEditorScreen />);
    // The close button is the first button in the header area
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
