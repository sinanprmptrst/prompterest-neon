import { useRef, useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { FeedCard } from '../components/FeedCard';

export function FeedScreen() {
  const prompts = useStore((s) => s.prompts);
  const feedLoading = useStore((s) => s.feedLoading);
  const currentFeedIndex = useStore((s) => s.currentFeedIndex);
  const setCurrentFeedIndex = useStore((s) => s.setCurrentFeedIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleIndex, setVisibleIndex] = useState(currentFeedIndex);
  const [panelOpen, setPanelOpen] = useState(false);

  // Scroll to currentFeedIndex when navigating from Saved screen
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || prompts.length === 0) return;
    const targetScroll = currentFeedIndex * el.clientHeight;
    if (Math.abs(el.scrollTop - targetScroll) > 10) {
      el.scrollTop = targetScroll;
    }
    setVisibleIndex(currentFeedIndex);
  }, [currentFeedIndex, prompts.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const height = el.clientHeight;
    const index = Math.round(scrollTop / height);
    if (index !== visibleIndex && index >= 0 && index < prompts.length) {
      setVisibleIndex(index);
      setCurrentFeedIndex(index);
    }
  }, [visibleIndex, prompts.length, setCurrentFeedIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (feedLoading && prompts.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="font-body text-sm text-white/30">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40">No prompts yet</p>
          <p className="font-body text-sm text-white/20 text-center">Create your first prompt to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-surface-0">
      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {prompts.map((prompt) => (
          <div key={prompt.id} className="w-full h-full snap-start snap-always">
            <FeedCard prompt={prompt} onPanelChange={setPanelOpen} />
          </div>
        ))}
      </div>

      {/* Page indicator — hidden when a panel is open */}
      {!panelOpen && (
        <div className="absolute top-14 right-5 z-30 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08]">
            <span className="font-mono text-xs text-white/70">
              {visibleIndex + 1}
              <span className="text-white/30"> / {prompts.length}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
