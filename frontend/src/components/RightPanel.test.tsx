import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RightPanel } from './RightPanel';
import { useStore } from '../store/useStore';
import type { ApiVersion } from '../services/api';

function makeVersion(overrides: Partial<ApiVersion> = {}): ApiVersion {
  return {
    id: 'v1',
    promptId: 'p1',
    content: 'A cinematic sunset',
    imageUrl: null,
    versionName: 'v1.0',
    createdAt: new Date('2026-01-01').toISOString(),
    ...overrides,
  };
}

describe('RightPanel', () => {
  beforeEach(() => {
    // Provide a no-op for the useEffect API call
    useStore.setState({
      versionHistory: [],
      historyLoading: false,
      activeVersionId: null,
      loadVersionHistory: vi.fn().mockResolvedValue(undefined),
      setActiveVersionId: vi.fn(),
    });
  });

  it('shows a loading skeleton while history is loading', () => {
    useStore.setState({ historyLoading: true });
    const { container } = render(<RightPanel promptId="p1" />);
    // Skeleton uses animate-pulse class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when there are no versions', () => {
    render(<RightPanel promptId="p1" />);
    expect(screen.getByText(/no versions yet/i)).toBeInTheDocument();
  });

  it('renders a version item when history is loaded', () => {
    useStore.setState({
      versionHistory: [makeVersion({ versionName: 'v2.0' })],
      historyLoading: false,
    });
    render(<RightPanel promptId="p1" />);
    expect(screen.getByText('v2.0')).toBeInTheDocument();
  });

  it('renders version content text', () => {
    useStore.setState({
      versionHistory: [makeVersion({ content: 'Neon cyberpunk cityscape' })],
      historyLoading: false,
    });
    render(<RightPanel promptId="p1" />);
    expect(screen.getByText('Neon cyberpunk cityscape')).toBeInTheDocument();
  });

  it('shows correct version count in the header', () => {
    useStore.setState({
      versionHistory: [makeVersion(), makeVersion({ id: 'v2', versionName: 'v2.0' })],
      historyLoading: false,
    });
    render(<RightPanel promptId="p1" />);
    expect(screen.getByText('2 versions')).toBeInTheDocument();
  });
});
