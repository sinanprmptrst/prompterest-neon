import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, getDisplayedVersion } from '../store/useStore';
import { useRefactor } from '../hooks/useRefactor';
import { generateImage } from '../services/api';
import { HighlightedPrompt } from '../components/HighlightedPrompt';

export function PromptEditorScreen() {
  const editorPromptId = useStore((s) => s.editorPromptId);
  const closeEditor = useStore((s) => s.closeEditor);
  const prompts = useStore((s) => s.prompts);
  const applyRefactorResult = useStore((s) => s.applyRefactorResult);
  const activeVersionData = useStore((s) => s.activeVersionData);
  const activeVersionId = useStore((s) => s.activeVersionId);

  const prompt = prompts.find((p) => p.id === editorPromptId) ?? null;
  const version = prompt
    ? getDisplayedVersion(prompt, activeVersionData, activeVersionId)
    : null;
  const content = version?.content ?? '';
  const existingImageUrl = version?.imageUrl || '';

  const refactor = useRefactor(editorPromptId ?? '', content);

  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImageBlob, setGeneratedImageBlob] = useState<Blob | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentContent =
    isManualEdit
      ? manualContent
      : refactor.phase === 'active' || refactor.phase === 'applying'
      ? refactor.buildModifiedPrompt()
      : content;

  const hasChanges = currentContent !== content || generatedImageUrl !== null;

  const handleToggleManualEdit = useCallback(() => {
    if (isManualEdit) {
      // Exit manual mode — discard edits
      setIsManualEdit(false);
      setManualContent('');
    } else {
      // Enter manual mode — start from current content
      setIsManualEdit(true);
      setManualContent(currentContent);
      refactor.resetRefactor();
    }
  }, [isManualEdit, currentContent, refactor]);

  const handleGenerate = useCallback(async () => {
    setImageLoading(true);
    setImageError(null);
    try {
      const { imageUrl, imageBlob } = await generateImage(currentContent);
      setGeneratedImageUrl(imageUrl);
      setGeneratedImageBlob(imageBlob);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setImageLoading(false);
    }
  }, [currentContent]);

  const handleApply = useCallback(async () => {
    if (!hasChanges || !editorPromptId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await applyRefactorResult(
        editorPromptId,
        currentContent,
        generatedImageUrl ?? undefined
      );
      closeEditor();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }, [hasChanges, editorPromptId, currentContent, generatedImageBlob, applyRefactorResult, closeEditor]);

  if (!prompt) return null;

  const displayImageUrl = generatedImageUrl || existingImageUrl;
  const isRefactorActive = refactor.phase === 'active' || refactor.phase === 'applying';
  const isLoading = refactor.phase === 'loading';
  const isBusy = isLoading || imageLoading || saving;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-surface-0 flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/[0.06]">
        <button
          onClick={closeEditor}
          disabled={saving}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] font-semibold text-white truncate">
            {prompt.title}
          </p>
        </div>

        {isRefactorActive && !isManualEdit && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-violet/15 border border-accent-violet/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse" />
            <span className="font-mono text-[10px] text-accent-violet">LIVE</span>
          </motion.span>
        )}

        {isManualEdit && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-emerald/15 border border-accent-emerald/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
            <span className="font-mono text-[10px] text-accent-emerald">EDIT</span>
          </motion.span>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">

        {/* Prompt box */}
        <div className="relative bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
          {isManualEdit ? (
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              autoFocus
              rows={8}
              className="w-full bg-transparent font-body text-[15px] leading-relaxed text-white/90 outline-none resize-none placeholder:text-white/25"
              placeholder="Edit your prompt..."
            />
          ) : isRefactorActive && refactor.result ? (
            <HighlightedPrompt
              originalPrompt={refactor.result.originalPrompt}
              segments={refactor.result.segments}
              selectedAlts={refactor.selectedAlts}
              onSelectAlternative={refactor.selectAlternative}
            />
          ) : (
            <p className="font-body text-[15px] leading-relaxed text-white/80">
              {content || <span className="text-white/30">No content</span>}
            </p>
          )}

          {/* Loading shimmer */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-violet/10 to-transparent animate-shimmer" />
            </motion.div>
          )}
        </div>

        {/* Segment / selection badges */}
        <AnimatePresence>
          {isRefactorActive && !isManualEdit && refactor.result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-violet/10 border border-accent-violet/20">
                <span className="font-mono text-xs text-accent-violet">
                  {refactor.result.segments.length} segments
                </span>
              </span>
              {Object.keys(refactor.selectedAlts).length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20">
                  <span className="font-mono text-xs text-accent-emerald">
                    {Object.keys(refactor.selectedAlts).length} selected
                  </span>
                </span>
              )}
              <span className="font-body text-xs text-white/30">
                Tap highlighted text to swap
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image preview */}
        <AnimatePresence>
          {(displayImageUrl || imageLoading) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.06] aspect-square"
            >
              {imageLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <svg className="w-8 h-8 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="font-mono text-xs text-white/30">Generating image...</p>
                </div>
              ) : (
                <img
                  src={displayImageUrl}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Errors */}
        <AnimatePresence>
          {(refactor.error || imageError || saveError) && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-accent-rose font-body"
            >
              {refactor.error || imageError || saveError}
            </motion.p>
          )}
        </AnimatePresence>

      </div>

      {/* ── Bottom bar ── */}
      <div className="px-5 pt-4 pb-8 border-t border-white/[0.06] space-y-3">

        {/* Row 1: secondary actions */}
        <div className="flex gap-2">
          {/* Refactor */}
          <button
            onClick={refactor.startRefactor}
            disabled={isBusy || isManualEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] font-display text-xs font-medium text-white/70 active:scale-[0.97] transition-transform disabled:opacity-40"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            )}
            Refactor
          </button>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] font-display text-xs font-medium text-white/70 active:scale-[0.97] transition-transform disabled:opacity-40"
          >
            {imageLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
            Generate
          </button>

          {/* Customize */}
          <button
            onClick={handleToggleManualEdit}
            disabled={saving || isLoading}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border font-display text-xs font-medium active:scale-[0.97] transition-all disabled:opacity-40 ${
              isManualEdit
                ? 'bg-accent-emerald/15 border-accent-emerald/25 text-accent-emerald'
                : 'bg-white/[0.06] border-white/[0.08] text-white/70'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {isManualEdit ? 'Discard' : 'Edit'}
          </button>
        </div>

        {/* Row 2: primary CTA */}
        <button
          onClick={handleApply}
          disabled={!hasChanges || saving}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-accent-emerald font-display text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-30"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply → New Version
            </>
          )}
        </button>

      </div>
    </motion.div>
  );
}
