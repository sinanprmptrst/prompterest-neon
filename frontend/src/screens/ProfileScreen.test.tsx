import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import { useStore } from '../store/useStore';

const BASE_STATE = {
  user: null,
  authLoading: false,
  authError: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  openNewPrompt: vi.fn(),
  savedPrompts: [],
  prompts: [],
};

describe('ProfileScreen — unauthenticated', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('renders Sign In mode by default', () => {
    render(<ProfileScreen />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has email and password inputs', () => {
    render(<ProfileScreen />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('switches to register mode when toggle link is clicked', async () => {
    render(<ProfileScreen />);
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows an extra name input in register mode', async () => {
    render(<ProfileScreen />);
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
  });

  it('shows an auth error when one is present', () => {
    useStore.setState({ authError: 'Invalid credentials' });
    render(<ProfileScreen />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('disables the submit button while auth is loading', () => {
    useStore.setState({ authLoading: true });
    render(<ProfileScreen />);
    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });
});

describe('ProfileScreen — authenticated', () => {
  beforeEach(() => {
    useStore.setState({
      ...BASE_STATE,
      user: { id: 'u1', email: 'user@example.com', username: 'tester' },
      prompts: [],
      savedPrompts: [],
    });
  });

  it('shows the user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('renders a Sign Out button', () => {
    render(<ProfileScreen />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('renders a New Prompt button', () => {
    render(<ProfileScreen />);
    expect(screen.getByRole('button', { name: /new prompt/i })).toBeInTheDocument();
  });

  it('calls logout when Sign Out is clicked', async () => {
    const logout = vi.fn();
    useStore.setState({ logout });
    render(<ProfileScreen />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
