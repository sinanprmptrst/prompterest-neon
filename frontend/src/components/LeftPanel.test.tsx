import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftPanel } from './LeftPanel';

// Clipboard API is not implemented in jsdom — stub it
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
});

describe('LeftPanel', () => {
  beforeEach(() => writeText.mockClear());

  it('renders the prompt content text', () => {
    render(<LeftPanel content="A cinematic sunset over the ocean" title="Sunset" />);
    expect(screen.getByText('A cinematic sunset over the ocean')).toBeInTheDocument();
  });

  it('renders the prompt title', () => {
    render(<LeftPanel content="Any content" title="My Favourite Prompt" />);
    expect(screen.getByText('My Favourite Prompt')).toBeInTheDocument();
  });

  it('has a Copy button', () => {
    render(<LeftPanel content="test" title="T" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('copies content to clipboard when Copy is clicked', async () => {
    render(<LeftPanel content="Prompt text to copy" title="T" />);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('Prompt text to copy');
  });

  it('shows "Copied" feedback after clicking copy', async () => {
    render(<LeftPanel content="anything" title="T" />);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });
});
