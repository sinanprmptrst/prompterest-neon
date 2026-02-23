import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { generateImage } from '../services/api';
import { hapticLight, hapticMedium } from '../utils/haptics';

export function NewPromptScreen() {
  const closeNewPrompt = useStore((s) => s.closeNewPrompt);
  const createNewPrompt = useStore((s) => s.createNewPrompt);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) return;
    hapticLight();
    setImageLoading(true);
    setImageError(null);
    try {
      const { imageUrl } = await generateImage(content);
      setGeneratedImageUrl(imageUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setImageLoading(false);
    }
  }, [content]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    hapticMedium();
    setSaving(true);
    setSaveError(null);
    try {
      await createNewPrompt(title.trim(), content.trim(), [], generatedImageUrl ?? undefined);
      closeNewPrompt();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }, [title, content, generatedImageUrl, createNewPrompt, closeNewPrompt]);

  const canSave = title.trim().length > 0 && content.trim().length > 0;
  const isBusy = imageLoading || saving;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-surface-0 flex flex-col"
    >
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/[0.06]">
        <button
          onClick={closeNewPrompt}
          disabled={saving}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="font-display text-[15px] font-semibold text-white">New Prompt</p>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
        <div>
          <label className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your prompt a title..."
            disabled={saving}
            className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] font-body text-[15px] text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors disabled:opacity-40"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2 block">Prompt</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your image generation prompt here..."
            disabled={saving}
            rows={6}
            className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] font-body text-[15px] leading-relaxed text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors resize-none disabled:opacity-40"
          />
        </div>

        <AnimatePresence>
          {(generatedImageUrl || imageLoading) && (
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
                <img src={generatedImageUrl!} alt="Generated" className="w-full h-full object-cover" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(imageError || saveError) && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-accent-rose font-body"
            >
              {imageError || saveError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 pt-4 pb-8 border-t border-white/[0.06] space-y-3">
        <button
          onClick={handleGenerate}
          disabled={isBusy || !content.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] font-display text-sm font-medium text-white/70 active:scale-[0.97] transition-transform disabled:opacity-40"
        >
          {generatedImageUrl ? 'Regenerate Image' : 'Generate Image'}
        </button>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-accent-emerald font-display text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-30"
        >
          {saving ? 'Saving...' : 'Save Prompt'}
        </button>
      </div>
    </motion.div>
  );
}
