import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HighlightedPrompt } from './HighlightedPrompt';
import type { RefactorSegment, SelectedAlternatives } from '../types/index';

// ── Factories ──────────────────────────────────────────────

function makeSegment(overrides: Partial<RefactorSegment> = {}): RefactorSegment {
  return {
    id: 'seg-1',
    original: 'a cat',
    startIndex: 2,
    endIndex: 7,
    reason: 'subject variation',
    alternatives: [
      { id: 'alt-1', text: 'a dog' },
      { id: 'alt-2', text: 'a bird' },
    ],
    ...overrides,
  };
}

const NO_ALTS: SelectedAlternatives = {};

describe('HighlightedPrompt', () => {
  it('renders the original prompt text when there are no segments', () => {
    render(
      <HighlightedPrompt
        originalPrompt="a beautiful sunset"
        segments={[]}
        selectedAlts={NO_ALTS}
        onSelectAlternative={vi.fn()}
      />
    );
    expect(screen.getByText('a beautiful sunset')).toBeInTheDocument();
  });

  it('renders highlighted segment text as a button', () => {
    const seg = makeSegment({ original: 'a cat', startIndex: 2, endIndex: 7 });
    render(
      <HighlightedPrompt
        originalPrompt="I a cat running"
        segments={[seg]}
        selectedAlts={NO_ALTS}
        onSelectAlternative={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'a cat' })).toBeInTheDocument();
  });

  it('renders surrounding plain text alongside the segment', () => {
    const seg = makeSegment({ original: 'a cat', startIndex: 2, endIndex: 7 });
    const { container } = render(
      <HighlightedPrompt
        originalPrompt="I a cat running"
        segments={[seg]}
        selectedAlts={NO_ALTS}
        onSelectAlternative={vi.fn()}
      />
    );
    // Text fragments sit in sibling spans — check the full rendered text content
    expect(container.textContent).toContain('I ');
    expect(container.textContent).toContain(' running');
  });

  it('opens alternatives dropdown when segment button is clicked', async () => {
    const seg = makeSegment();
    render(
      <HighlightedPrompt
        originalPrompt="I a cat running"
        segments={[seg]}
        selectedAlts={NO_ALTS}
        onSelectAlternative={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'a cat' }));
    // Alternatives become visible
    expect(screen.getByText('a dog')).toBeInTheDocument();
    expect(screen.getByText('a bird')).toBeInTheDocument();
  });

  it('calls onSelectAlternative with the correct ids when an alternative is chosen', async () => {
    const onSelect = vi.fn();
    const seg = makeSegment({ id: 'seg-1' });
    render(
      <HighlightedPrompt
        originalPrompt="I a cat running"
        segments={[seg]}
        selectedAlts={NO_ALTS}
        onSelectAlternative={onSelect}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'a cat' }));
    await userEvent.click(screen.getByText('a dog'));
    expect(onSelect).toHaveBeenCalledWith('seg-1', 'alt-1');
  });

  it('shows the selected alternative text on the segment button', () => {
    const seg = makeSegment();
    const selectedAlts: SelectedAlternatives = { 'seg-1': 'alt-2' };
    render(
      <HighlightedPrompt
        originalPrompt="I a cat running"
        segments={[seg]}
        selectedAlts={selectedAlts}
        onSelectAlternative={vi.fn()}
      />
    );
    // Button should show the selected alt text, not the original
    expect(screen.getByRole('button', { name: 'a bird' })).toBeInTheDocument();
  });
});
