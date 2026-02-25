import { useState, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion';
import type { ApiPrompt } from '../services/api';
import { useStore, getDisplayedVersion } from '../store/useStore';
import { BookmarkButton } from './BookmarkButton';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { hapticMedium, hapticSelection } from '../utils/haptics';

interface FeedCardProps {
  prompt: ApiPrompt;
  onPanelChange?: (isOpen: boolean) => void;
}

type PanelState = 'none' | 'left' | 'right';

const SWIPE_THRESHOLD = 60;

export function FeedCard({ prompt, onPanelChange }: Readonly<FeedCardProps>) {
  const toggleSave = useStore((s) => s.toggleSave);
  const savedPromptIds = useStore((s) => s.savedPromptIds);
  const activeVersionId = useStore((s) => s.activeVersionId);
  const activeVersionData = useStore((s) => s.activeVersionData);
  const openEditor = useStore((s) => s.openEditor);
  const user = useStore((s) => s.user);
  const [panel, setPanel] = useState<PanelState>('none');
  const containerRef = useRef<HTMLDivElement>(null);

  const version = getDisplayedVersion(prompt, activeVersionData, activeVersionId);
  const content = version?.content || '';
  const imageUrl = version?.imageUrl || '';
  const versionName = version?.versionName || '';
  const isSaved = savedPromptIds.has(prompt.id);

  const x = useMotionValue(0);
  const scale = useTransform(x, [-200, 0, 200], [0.92, 1, 0.92]);
  const borderRadius = useTransform(x, [-200, 0, 200], [24, 0, 24]);

  const openPanel = (p: 'left' | 'right') => {
    setPanel(p);
    onPanelChange?.(true);
  };

  const closePanel = () => {
    if (panel !== 'none') {
      hapticSelection();
      setPanel('none');
      onPanelChange?.(false);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset } = info;

    if (panel !== 'none') {
      if (
        (panel === 'left' && offset.x < -SWIPE_THRESHOLD) ||
        (panel === 'right' && offset.x > SWIPE_THRESHOLD)
      ) {
        closePanel();
      }
      return;
    }

    if (offset.x > SWIPE_THRESHOLD) {
      hapticMedium();
      openPanel('left');
    } else if (offset.x < -SWIPE_THRESHOLD) {
      hapticMedium();
      openPanel('right');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-surface-1"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={prompt.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        )}
      </div>

      {/* Swipeable card layer */}
      <motion.div
        style={{ x, scale, borderRadius }}
        drag={panel === 'none' ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        className="relative w-full h-full z-10"
        onClick={closePanel}
      >
        {/* Card image */}
        <div className="absolute inset-0">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={prompt.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          )}
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Card content overlay */}
        <AnimatePresence>
          {panel === 'none' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col justify-between pointer-events-none"
            >
              {/* Top: version badge */}
              <div className="pt-14 px-5 pointer-events-auto">
                {versionName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08]">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                    <span className="font-mono text-[11px] text-white/80">
                      {versionName}
                    </span>
                  </span>
                )}
              </div>

              {/* Bottom: title + content + bookmark */}
              <div className="px-5 pb-28 pointer-events-auto">
                <div className="flex items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-semibold text-white mb-1">
                      {prompt.title}
                    </h3>
                    <p className="font-body text-[14px] leading-snug text-white/70 line-clamp-2">
                      {content}
                    </p>
                    <p className="font-body text-xs text-white/30 mt-1.5">
                      Swipe to explore
                    </p>
                  </div>
                  <BookmarkButton
                    isBookmarked={isSaved}
                    onToggle={() => toggleSave(prompt.id)}
                  />
                </div>
                {user && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticMedium();
                      openEditor(prompt.id);
                    }}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-violet/20 border border-accent-violet/30 active:scale-95 transition-transform"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                    </svg>
                    <span className="font-mono text-[11px] text-accent-violet">Refactor</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panels */}
      <AnimatePresence>
        {panel === 'left' && (
          <div
            role="button"
            tabIndex={0}
            onClick={closePanel}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closePanel(); } }}
          >
            <LeftPanel content={content} title={prompt.title} />
          </div>
        )}
        {panel === 'right' && (
          <div
            role="button"
            tabIndex={0}
            onClick={closePanel}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closePanel(); } }}
          >
            <RightPanel promptId={prompt.id} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
