import { useState } from 'react';
import { motion } from 'framer-motion';
import { hapticLight } from '../utils/haptics';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export function BookmarkButton({ isBookmarked, onToggle, size = 'md' }: BookmarkButtonProps) {
  const [animKey, setAnimKey] = useState(0);
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <motion.button
      key={animKey}
      onClick={(e) => {
        e.stopPropagation();
        hapticLight();
        setAnimKey((k) => k + 1);
        onToggle();
      }}
      whileTap={{ scale: 0.85 }}
      animate={
        isBookmarked
          ? { scale: [1, 1.35, 1], transition: { duration: 0.35, ease: 'easeOut' } }
          : {}
      }
      className={`flex items-center justify-center rounded-full transition-colors ${
        size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
      } ${
        isBookmarked
          ? 'bg-accent-amber/20'
          : 'bg-white/10 active:bg-white/20'
      }`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isBookmarked ? '#fbbf24' : 'none'}
        stroke={isBookmarked ? '#fbbf24' : 'rgba(255,255,255,0.6)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    </motion.button>
  );
}
