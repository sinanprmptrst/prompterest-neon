import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { BookmarkButton } from '../components/BookmarkButton';

export function SavedScreen() {
  const savedPrompts = useStore((s) => s.savedPrompts);
  const savedLoading = useStore((s) => s.savedLoading);
  const toggleSave = useStore((s) => s.toggleSave);
  const navigateToPrompt = useStore((s) => s.navigateToPrompt);
  const user = useStore((s) => s.user);
  const loadSavedPrompts = useStore((s) => s.loadSavedPrompts);

  useEffect(() => {
    if (user) loadSavedPrompts();
  }, [user, loadSavedPrompts]);

  if (!user) {
    return (
      <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="px-5 pt-14 pb-4">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Saved</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-8 pt-32">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40 mb-1">Sign in to save prompts</p>
          <p className="font-body text-sm text-white/20 text-center">Go to Profile tab to log in</p>
        </div>
      </div>
    );
  }

  let savedContent: JSX.Element;
  if (savedLoading && savedPrompts.length === 0) {
    savedContent = (
      <div className="flex items-center justify-center pt-32">
        <svg className="w-6 h-6 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  } else if (savedPrompts.length === 0) {
    savedContent = (
    <div className="flex flex-col items-center justify-center px-8 pt-32">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </div>
      <p className="font-display text-base font-medium text-white/40 mb-1">No saved items yet</p>
      <p className="font-body text-sm text-white/20 text-center">Bookmark items from your feed to see them here</p>
    </div>
    );
  } else {
    savedContent = (
    <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
      {savedPrompts.map((savedItem, i) => {
        const prompt = savedItem.prompt;
        if (!prompt) return null;
        const version = prompt.currentVersion;
        const imageUrl = version?.imageUrl || '';

        return (
          <motion.div
            key={savedItem.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="relative rounded-2xl overflow-hidden bg-surface-2 border border-white/[0.04]"
            onClick={() => navigateToPrompt(prompt.id)}
          >
            {/* Thumbnail */}
            <div className="aspect-square relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={prompt.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-surface-3 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Bookmark - top right */}
              <button
                type="button"
                className="absolute top-2 right-2 bg-transparent border-0 p-0 m-0"
                onClick={(e) => e.stopPropagation()}
              >
                <BookmarkButton
                  isBookmarked={true}
                  onToggle={() => toggleSave(prompt.id)}
                  size="sm"
                />
              </button>
            </div>

            {/* Title */}
            <div className="p-3">
              <p className="font-display text-xs font-medium text-white/70 line-clamp-2 leading-relaxed">
                {prompt.title}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
    );
  }

  return (
    <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="px-5 pt-14 pb-4">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Saved</h1>
          <p className="font-body text-sm text-white/40 mt-0.5">
            {savedPrompts.length} {savedPrompts.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {savedContent}
    </div>
  );
}
