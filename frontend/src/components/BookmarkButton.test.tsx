import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkButton } from './BookmarkButton';

// BookmarkButton is a self-contained component with no store dependency.
// Tests focus on: does it call back when clicked? Does it render a button?

describe('BookmarkButton', () => {
  it('renders a clickable button', () => {
    render(<BookmarkButton isBookmarked={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<BookmarkButton isBookmarked={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle regardless of the current bookmarked state', async () => {
    const onToggle = vi.fn();
    render(<BookmarkButton isBookmarked={true} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders an SVG icon inside the button', () => {
    const { container } = render(<BookmarkButton isBookmarked={false} onToggle={vi.fn()} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('accepts optional size prop without crashing', () => {
    expect(() =>
      render(<BookmarkButton isBookmarked={false} onToggle={vi.fn()} size="sm" />)
    ).not.toThrow();
    expect(() =>
      render(<BookmarkButton isBookmarked={false} onToggle={vi.fn()} size="md" />)
    ).not.toThrow();
  });
});
