import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { getRelativeTime, formatFullDate } from '../utils/time';
import { hapticLight } from '../utils/haptics';

interface RightPanelProps {
  promptId: string;
}

export function RightPanel({ promptId }: Readonly<RightPanelProps>) {
  const versionHistory = useStore((s) => s.versionHistory);
  const historyLoading = useStore((s) => s.historyLoading);
  const loadVersionHistory = useStore((s) => s.loadVersionHistory);
  const activeVersionId = useStore((s) => s.activeVersionId);
  const setActiveVersionId = useStore((s) => s.setActiveVersionId);

  useEffect(() => {
    loadVersionHistory(promptId);
  }, [promptId, loadVersionHistory]);

  const handleSelectVersion = (versionId: string) => {
    hapticLight();
    if (activeVersionId === versionId) {
      setActiveVersionId(null);
    } else {
      setActiveVersionId(versionId);
    }
  };

  const versionListContent = historyLoading ? (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-4 animate-pulse">
          <div className="h-4 w-20 bg-white/[0.06] rounded mb-2" />
          <div className="h-3 w-full bg-white/[0.04] rounded mb-1.5" />
          <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
        </div>
      ))}
    </>
  ) : versionHistory.length === 0 ? (
    <div className="flex flex-col items-center justify-center pt-16">
      <p className="font-body text-sm text-white/30">No versions yet</p>
    </div>
  ) : (
    versionHistory.map((version, i) => {
      const isSelected = activeVersionId === version.id;
      const thumbUrl = version.imageUrl || '';

      return (
        <motion.button
          key={version.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectVersion(version.id);
          }}
          className={`w-full text-left rounded-2xl p-4 transition-colors ${
            isSelected
              ? 'bg-accent-amber/[0.12] border border-accent-amber/25'
              : 'bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.06]'
          }`}
        >
          <div className="flex gap-3">
            {thumbUrl && (
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-surface-3">
                <img
                  src={thumbUrl}
                  alt={version.versionName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`font-mono text-xs font-medium px-2 py-0.5 rounded ${
                  isSelected
                    ? 'text-accent-amber bg-accent-amber/15'
                    : 'text-white/50 bg-white/[0.06]'
                }`}>
                  {version.versionName}
                </span>
                <span className="font-body text-[10px] text-white/30">
                  {getRelativeTime(version.createdAt)}
                </span>
                {isSelected && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-accent-amber" />
                )}
              </div>

              <p className="font-body text-xs text-white/40 line-clamp-2 leading-relaxed">
                {version.content}
              </p>

              <p className="font-body text-[10px] text-white/20 mt-1.5">
                {formatFullDate(version.createdAt)}
              </p>
            </div>
          </div>
        </motion.button>
      );
    })
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-20 flex flex-col"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-28">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-accent-amber/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-white tracking-tight">
            Version History
          </h2>
          <span className="ml-auto font-mono text-xs text-white/30">
            {versionHistory.length} versions
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain -mx-1 px-1 space-y-3">
          {versionListContent}
        </div>

        <p className="text-center text-xs text-white/25 font-body mt-4">
          {activeVersionId
            ? 'Tap again to deselect • Swipe left to close'
            : 'Swipe left to close'}
        </p>
      </div>
    </motion.div>
  );
}
