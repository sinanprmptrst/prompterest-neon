import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewPromptScreen } from './NewPromptScreen';
import { useStore } from '../store/useStore';

// generateImage is called conditionally — mock the whole api boundary
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, generateImage: vi.fn().mockResolvedValue({ imageUrl: 'https://example.com/img.png', imageBlob: new Blob() }) };
});

const BASE_STATE = {
  closeNewPrompt: vi.fn(),
  createNewPrompt: vi.fn().mockResolvedValue(undefined),
};

describe('NewPromptScreen', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('renders the Title input associated with its label', () => {
    render(<NewPromptScreen />);
    // getByLabelText finds the input via htmlFor ↔ id linkage
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders the Prompt textarea associated with its label', () => {
    render(<NewPromptScreen />);
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
  });

  it('renders a Save Prompt button', () => {
    render(<NewPromptScreen />);
    expect(screen.getByRole('button', { name: /save prompt/i })).toBeInTheDocument();
  });

  it('Save Prompt is disabled until both title and content are filled', async () => {
    render(<NewPromptScreen />);
    expect(screen.getByRole('button', { name: /save prompt/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My title' } });
    expect(screen.getByRole('button', { name: /save prompt/i })).toBeDisabled(); // still needs content

    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: 'My prompt text' } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save prompt/i })).not.toBeDisabled()
    );
  });

  it('calls closeNewPrompt when the back button is clicked', async () => {
    const closeNewPrompt = vi.fn();
    useStore.setState({ closeNewPrompt });
    render(<NewPromptScreen />);
    // The close button has no accessible name text — query by its position or use first button
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]); // back button is always first
    expect(closeNewPrompt).toHaveBeenCalledTimes(1);
  });

  it('calls createNewPrompt with the entered values on save', async () => {
    const createNewPrompt = vi.fn().mockResolvedValue(undefined);
    const closeNewPrompt = vi.fn();
    useStore.setState({ createNewPrompt, closeNewPrompt });
    render(<NewPromptScreen />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My title' } });
    fireEvent.change(screen.getByLabelText(/prompt/i), { target: { value: 'My prompt content' } });
    await userEvent.click(screen.getByRole('button', { name: /save prompt/i }));

    expect(createNewPrompt).toHaveBeenCalledWith('My title', 'My prompt content', [], undefined);
  });

  it('renders a Generate Image button', () => {
    render(<NewPromptScreen />);
    expect(screen.getByRole('button', { name: /generate image/i })).toBeInTheDocument();
  });
});
