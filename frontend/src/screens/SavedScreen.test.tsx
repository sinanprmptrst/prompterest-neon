import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SavedScreen } from './SavedScreen';
import { useStore } from '../store/useStore';
import type { ApiSaved, ApiPrompt, ApiVersion } from '../services/api';

function makeVersion(): ApiVersion {
  return { id: 'v1', promptId: 'p1', content: 'test content', imageUrl: null, versionName: 'v1', createdAt: new Date().toISOString() };
}

function makePrompt(id = 'p1', title = 'My Prompt'): ApiPrompt {
  return { id, userId: 'u1', title, content: 'test', imageUrl: null, tags: [], isPublic: false, currentVersionId: 'v1', currentVersion: makeVersion(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function makeSaved(id = 's1', promptId = 'p1'): ApiSaved {
  return { id, userId: 'u1', promptId, createdAt: new Date().toISOString(), prompt: makePrompt(promptId) };
}

const BASE_STATE = {
  user: { id: 'u1', email: 'user@test.com', username: 'user' },
  savedPrompts: [] as ApiSaved[],
  savedLoading: false,
  toggleSave: vi.fn(),
  navigateToPrompt: vi.fn(),
  loadSavedPrompts: vi.fn().mockResolvedValue(undefined),
};

describe('SavedScreen', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('prompts to sign in when user is not logged in', () => {
    useStore.setState({ user: null });
    render(<SavedScreen />);
    expect(screen.getByText(/sign in to save prompts/i)).toBeInTheDocument();
  });

  it('shows a loading indicator while fetching and there are no saved prompts yet', () => {
    useStore.setState({ savedLoading: true, savedPrompts: [] });
    const { container } = render(<SavedScreen />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when loaded but nothing is saved', () => {
    useStore.setState({ savedLoading: false, savedPrompts: [] });
    render(<SavedScreen />);
    expect(screen.getByText(/no saved items yet/i)).toBeInTheDocument();
  });

  it('renders saved prompt titles when there are saved items', () => {
    useStore.setState({
      savedPrompts: [
        makeSaved('s1', 'p1'),
        makeSaved('s2', 'p2'),
      ],
    });
    // Rebuild prompts with correct ids
    useStore.setState({
      savedPrompts: [
        { ...makeSaved('s1', 'p1'), prompt: makePrompt('p1', 'First Prompt') },
        { ...makeSaved('s2', 'p2'), prompt: makePrompt('p2', 'Second Prompt') },
      ],
    });
    render(<SavedScreen />);
    expect(screen.getByText('First Prompt')).toBeInTheDocument();
    expect(screen.getByText('Second Prompt')).toBeInTheDocument();
  });

  it('shows the correct item count in the header', () => {
    useStore.setState({ savedPrompts: [makeSaved(), makeSaved('s2', 'p2')] });
    render(<SavedScreen />);
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it('shows "1 item" (singular) when exactly one prompt is saved', () => {
    useStore.setState({ savedPrompts: [makeSaved()] });
    render(<SavedScreen />);
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
  });
});
