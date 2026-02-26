import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedScreen } from './FeedScreen';
import { useStore } from '../store/useStore';
import type { ApiPrompt, ApiVersion } from '../services/api';

// Isolate FeedScreen from FeedCard implementation details
vi.mock('../components/FeedCard', () => ({
  FeedCard: ({ prompt }: { prompt: ApiPrompt }) => (
    <div data-testid="feed-card">{prompt.title}</div>
  ),
}));

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

const BASE_STATE = {
  prompts: [],
  feedLoading: false,
  currentFeedIndex: 0,
  setCurrentFeedIndex: vi.fn(),
};

describe('FeedScreen', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('shows loading spinner when feedLoading is true and prompts are empty', () => {
    useStore.setState({ feedLoading: true, prompts: [] });
    render(<FeedScreen />);
    expect(screen.getByText(/loading prompts/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no prompts', () => {
    render(<FeedScreen />);
    expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument();
  });

  it('shows help text in empty state', () => {
    render(<FeedScreen />);
    expect(screen.getByText(/create your first prompt/i)).toBeInTheDocument();
  });

  it('renders a FeedCard for each prompt', () => {
    useStore.setState({
      prompts: [
        makePrompt({ id: 'p1', title: 'First Prompt' }),
        makePrompt({ id: 'p2', title: 'Second Prompt' }),
      ],
    });
    render(<FeedScreen />);
    expect(screen.getAllByTestId('feed-card')).toHaveLength(2);
    expect(screen.getByText('First Prompt')).toBeInTheDocument();
    expect(screen.getByText('Second Prompt')).toBeInTheDocument();
  });

  it('shows page indicator with correct count when prompts are present', () => {
    useStore.setState({
      prompts: [makePrompt({ id: 'p1' }), makePrompt({ id: 'p2' }), makePrompt({ id: 'p3' })],
      currentFeedIndex: 0,
    });
    render(<FeedScreen />);
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
  });

  it('does not show loading spinner when feedLoading is true but prompts exist', () => {
    useStore.setState({ feedLoading: true, prompts: [makePrompt()] });
    render(<FeedScreen />);
    expect(screen.queryByText(/loading prompts/i)).not.toBeInTheDocument();
  });
});
