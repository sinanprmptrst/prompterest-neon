import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import type { TabId } from '../types';
import { hapticLight } from '../utils/haptics';

interface TabDef {
  id: TabId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const tabs: TabDef[] = [
  {
    id: 'saved',
    label: 'Saved',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#a78bfa' : 'none'} stroke={active ? '#a78bfa' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'feed',
    label: 'Feed',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a78bfa' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a78bfa' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <div className="absolute bottom-0 inset-x-0 z-50">
      {/* Blur background */}
      <div className="absolute inset-0 bg-surface-0/60 backdrop-blur-2xl border-t border-white/[0.04]" />

      {/* Safe area + nav content */}
      <div className="relative flex items-center justify-around px-6 pt-2 pb-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                hapticLight();
                setActiveTab(tab.id);
              }}
              className="flex flex-col items-center gap-1 py-1 px-4 -mx-2"
            >
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {tab.icon(isActive)}
              </motion.div>
              <span
                className={`font-display text-[10px] font-medium transition-colors ${
                  isActive ? 'text-accent-violet' : 'text-white/25'
                }`}
              >
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="w-1 h-1 rounded-full bg-accent-violet"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
