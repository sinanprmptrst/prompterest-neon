import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedCard } from './FeedCard';
import { useStore } from '../store/useStore';
import type { ApiPrompt, ApiVersion } from '../services/api';

function makeVersion(overrides: Partial<ApiVersion> = {}): ApiVersion {
  return {
    id: 'v1', promptId: 'p1', content: 'A cinematic sunset', imageUrl: null,
    versionName: 'v1.0', createdAt: new Date().toISOString(), ...overrides,
  };
}

function makePrompt(overrides: Partial<ApiPrompt> = {}): ApiPrompt {
  return {
    id: 'p1', userId: 'u1', title: 'Sunset Prompt', content: 'A cinematic sunset',
    imageUrl: null, tags: [], isPublic: false,
    currentVersionId: 'v1', currentVersion: makeVersion(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FeedCard', () => {
  beforeEach(() => {
    useStore.setState({
      savedPromptIds: new Set<string>(),
      activeVersionId: null,
      activeVersionData: null,
      user: null,
      toggleSave: vi.fn(),
      openEditor: vi.fn(),
    });
  });

  it('renders the prompt title', () => {
    render(<FeedCard prompt={makePrompt({ title: 'Golden Hour' })} />);
    expect(screen.getByText('Golden Hour')).toBeInTheDocument();
  });

  it('renders the prompt content', () => {
    render(<FeedCard prompt={makePrompt()} />);
    expect(screen.getByText('A cinematic sunset')).toBeInTheDocument();
  });

  it('renders a bookmark button', () => {
    render(<FeedCard prompt={makePrompt()} />);
    // BookmarkButton renders a button element
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows the Refactor button when user is logged in', () => {
    useStore.setState({ user: { id: 'u1', email: 'test@test.com', username: 'tester' } });
    render(<FeedCard prompt={makePrompt()} />);
    expect(screen.getByRole('button', { name: /refactor/i })).toBeInTheDocument();
  });

  it('does not show the Refactor button when not logged in', () => {
    useStore.setState({ user: null });
    render(<FeedCard prompt={makePrompt()} />);
    expect(screen.queryByRole('button', { name: /refactor/i })).not.toBeInTheDocument();
  });

  it('renders the version name badge when a version is active', () => {
    useStore.setState({
      activeVersionId: 'v2',
      activeVersionData: makeVersion({ id: 'v2', versionName: 'v2.0' }),
    });
    render(<FeedCard prompt={makePrompt()} />);
    expect(screen.getByText('v2.0')).toBeInTheDocument();
  });

  it('calls openEditor when Refactor button is clicked', async () => {
    const openEditorMock = vi.fn();
    useStore.setState({
      user: { id: 'u1', email: 'a@b.com', username: 'u' },
      openEditor: openEditorMock,
    });
    render(<FeedCard prompt={makePrompt({ id: 'prompt-123' })} />);
    const refactorBtn = screen.getByRole('button', { name: /refactor/i });
    await userEvent.click(refactorBtn);
    expect(openEditorMock).toHaveBeenCalledWith('prompt-123');
  });

  it('renders image when imageUrl is provided', () => {
    const version = makeVersion({ imageUrl: 'https://example.com/img.jpg' });
    render(<FeedCard prompt={makePrompt({ currentVersion: version })} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('does not render img element when imageUrl is null', () => {
    render(<FeedCard prompt={makePrompt({ imageUrl: null })} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows version badge when prompt has a currentVersion', () => {
    render(<FeedCard prompt={makePrompt()} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('renders title and content from currentVersion', () => {
    const version = makeVersion({ content: 'Custom content here' });
    render(<FeedCard prompt={makePrompt({ currentVersion: version })} />);
    expect(screen.getByText('Custom content here')).toBeInTheDocument();
  });
});
