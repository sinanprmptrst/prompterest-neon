import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';
import { useStore } from '../store/useStore';

const BASE_STATE = {
  activeTab: 'feed' as const,
  setActiveTab: vi.fn(),
};

describe('BottomNav', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('renders three tab buttons', () => {
    render(<BottomNav />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders Saved, Feed, and Profile labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('calls setActiveTab with "saved" when Saved tab is clicked', async () => {
    const setActiveTab = vi.fn();
    useStore.setState({ setActiveTab });
    render(<BottomNav />);
    await userEvent.click(screen.getByText('Saved'));
    expect(setActiveTab).toHaveBeenCalledWith('saved');
  });

  it('calls setActiveTab with "profile" when Profile tab is clicked', async () => {
    const setActiveTab = vi.fn();
    useStore.setState({ setActiveTab });
    render(<BottomNav />);
    await userEvent.click(screen.getByText('Profile'));
    expect(setActiveTab).toHaveBeenCalledWith('profile');
  });

  it('active tab label has accent color styling', () => {
    useStore.setState({ activeTab: 'saved' });
    render(<BottomNav />);
    expect(screen.getByText('Saved')).toHaveClass('text-accent-violet');
    expect(screen.getByText('Feed')).not.toHaveClass('text-accent-violet');
  });
});
