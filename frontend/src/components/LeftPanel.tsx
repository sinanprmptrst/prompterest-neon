import { useState } from 'react';
import { motion } from 'framer-motion';

interface LeftPanelProps {
  content: string;
  title: string;
}

export function LeftPanel({ content, title }: Readonly<LeftPanelProps>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for environments where clipboard API is unavailable
    }
  };

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
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-accent-violet/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-white tracking-tight flex-1">
            Prompt
          </h2>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-display text-xs font-medium transition-all active:scale-95 ${
              copied
                ? 'bg-accent-emerald/15 border-accent-emerald/25 text-accent-emerald'
                : 'bg-white/[0.06] border-white/[0.08] text-white/50'
            }`}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Title */}
        <p className="font-display text-sm font-medium text-white/50 mb-3">{title}</p>

        {/* Prompt content */}
        <div className="flex-1 overflow-y-auto overscroll-contain -mx-1 px-1">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
            <p className="font-body text-[15px] leading-relaxed text-white/80">
              {content}
            </p>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="mt-6">
          <p className="text-center text-xs text-white/25 font-body">
            Swipe right to close
          </p>
        </div>
      </div>
    </motion.div>
  );
}
