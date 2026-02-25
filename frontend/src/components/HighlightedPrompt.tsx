import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RefactorSegment, SelectedAlternatives } from '../types';
import { hapticSelection } from '../utils/haptics';

interface HighlightedPromptProps {
  originalPrompt: string;
  segments: RefactorSegment[];
  selectedAlts: SelectedAlternatives;
  onSelectAlternative: (segmentId: string, alternativeId: string) => void;
}

export function HighlightedPrompt({
  originalPrompt,
  segments,
  selectedAlts,
  onSelectAlternative,
}: Readonly<HighlightedPromptProps>) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedSegments = [...segments].sort(
    (a, b) => a.startIndex - b.startIndex
  );

  // Build text fragments: alternating plain text and highlighted segments
  const fragments: Array<
    | { type: 'text'; text: string; key: string }
    | { type: 'segment'; segment: RefactorSegment; key: string }
  > = [];

  let cursor = 0;
  for (const seg of sortedSegments) {
    if (seg.startIndex > cursor) {
      fragments.push({
        type: 'text',
        text: originalPrompt.substring(cursor, seg.startIndex),
        key: `t-${cursor}`,
      });
    }
    fragments.push({ type: 'segment', segment: seg, key: seg.id });
    cursor = seg.endIndex;
  }
  if (cursor < originalPrompt.length) {
    fragments.push({
      type: 'text',
      text: originalPrompt.substring(cursor),
      key: `t-${cursor}`,
    });
  }

  const handleSegmentTap = useCallback((segmentId: string) => {
    hapticSelection();
    setActiveSegmentId((prev) => (prev === segmentId ? null : segmentId));
  }, []);

  const handleAlternativeSelect = useCallback(
    (segmentId: string, altId: string) => {
      hapticSelection();
      onSelectAlternative(segmentId, altId);
      setActiveSegmentId(null);
    },
    [onSelectAlternative]
  );

  const getSegmentDisplayText = (segment: RefactorSegment): string => {
    const altId = selectedAlts[segment.id];
    if (altId) {
      const alt = segment.alternatives.find((a) => a.id === altId);
      if (alt) return alt.text;
    }
    return segment.original;
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="font-body text-[15px] leading-relaxed text-white/80">
        {fragments.map((frag) => {
          if (frag.type === 'text') {
            return <span key={frag.key}>{frag.text}</span>;
          }

          const seg = frag.segment;
          const isActive = activeSegmentId === seg.id;
          const hasSelection = !!selectedAlts[seg.id];

          return (
            <span key={seg.id} className="relative inline">
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSegmentTap(seg.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSegmentTap(seg.id);
                  }
                }}
                className={[
                  'relative cursor-pointer transition-all duration-200',
                  'border-b-2 rounded-sm px-0.5 -mx-0.5',
                  hasSelection
                    ? 'border-accent-emerald/60 bg-accent-emerald/10 text-accent-emerald'
                    : 'border-accent-violet/60 bg-accent-violet/10 text-accent-violet',
                  isActive ? 'bg-accent-violet/20' : '',
                  'active:scale-[0.98]',
                ].join(' ')}
              >
                {getSegmentDisplayText(seg)}
              </span>

              <AnimatePresence>
                {isActive && (
                  <AlternativeDropdown
                    segment={seg}
                    selectedAltId={selectedAlts[seg.id]}
                    onSelect={(altId) =>
                      handleAlternativeSelect(seg.id, altId)
                    }
                  />
                )}
              </AnimatePresence>
            </span>
          );
        })}
      </p>
    </div>
  );
}

// --- Alternative Dropdown ---

interface AlternativeDropdownProps {
  segment: RefactorSegment;
  selectedAltId?: string;
  onSelect: (altId: string) => void;
}

function AlternativeDropdown({
  segment,
  selectedAltId,
  onSelect,
}: Readonly<AlternativeDropdownProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute left-0 right-0 top-full z-50 mt-2"
      style={{ minWidth: '240px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-surface-3 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Reason header */}
        <div className="px-4 py-2.5 border-b border-white/[0.06]">
          <p className="font-mono text-[10px] text-accent-violet/70 uppercase tracking-wider">
            {segment.reason}
          </p>
        </div>

        {/* Alternatives list */}
        <div className="py-1">
          {segment.alternatives.map((alt, i) => {
            const isSelected = selectedAltId === alt.id;
            return (
              <motion.button
                key={alt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.15 }}
                onClick={() => onSelect(alt.id)}
                className={[
                  'w-full text-left px-4 py-3 flex items-start gap-3',
                  'transition-colors active:bg-white/[0.04]',
                  isSelected ? 'bg-accent-violet/10' : '',
                ].join(' ')}
              >
                {/* Radio indicator */}
                <div
                  className={[
                    'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? 'border-accent-violet bg-accent-violet'
                      : 'border-white/20',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <p className="font-body text-sm text-white/80 leading-relaxed">
                  {alt.text}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
