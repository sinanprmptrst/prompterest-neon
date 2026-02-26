import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useStore } from './store/useStore';

// Isolate App from child screen implementations
vi.mock('./screens/FeedScreen', () => ({ FeedScreen: () => <div>FeedScreen</div> }));
vi.mock('./screens/SavedScreen', () => ({ SavedScreen: () => <div>SavedScreen</div> }));
vi.mock('./screens/ProfileScreen', () => ({ ProfileScreen: () => <div>ProfileScreen</div> }));
vi.mock('./screens/PromptEditorScreen', () => ({ PromptEditorScreen: () => <div>PromptEditorScreen</div> }));
vi.mock('./screens/NewPromptScreen', () => ({ NewPromptScreen: () => <div>NewPromptScreen</div> }));
vi.mock('./components/BottomNav', () => ({ BottomNav: () => <nav>BottomNav</nav> }));

const BASE_STATE = {
  activeTab: 'feed' as const,
  editorPromptId: null,
  newPromptOpen: false,
  initAuth: vi.fn(),
  loadPrompts: vi.fn().mockResolvedValue(undefined),
};

describe('App', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('always renders BottomNav', () => {
    render(<App />);
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });

  it('renders FeedScreen when activeTab is "feed"', () => {
    render(<App />);
    expect(screen.getByText('FeedScreen')).toBeInTheDocument();
  });

  it('renders SavedScreen when activeTab is "saved"', () => {
    useStore.setState({ activeTab: 'saved' });
    render(<App />);
    expect(screen.getByText('SavedScreen')).toBeInTheDocument();
  });

  it('renders ProfileScreen when activeTab is "profile"', () => {
    useStore.setState({ activeTab: 'profile' });
    render(<App />);
    expect(screen.getByText('ProfileScreen')).toBeInTheDocument();
  });

  it('renders PromptEditorScreen when editorPromptId is set', () => {
    useStore.setState({ editorPromptId: 'some-prompt-id' });
    render(<App />);
    expect(screen.getByText('PromptEditorScreen')).toBeInTheDocument();
  });

  it('renders NewPromptScreen when newPromptOpen is true', () => {
    useStore.setState({ newPromptOpen: true });
    render(<App />);
    expect(screen.getByText('NewPromptScreen')).toBeInTheDocument();
  });

  it('calls initAuth and loadPrompts on mount', () => {
    const initAuth = vi.fn();
    const loadPrompts = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ initAuth, loadPrompts });
    render(<App />);
    expect(initAuth).toHaveBeenCalledTimes(1);
    expect(loadPrompts).toHaveBeenCalledTimes(1);
  });
});
