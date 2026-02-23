import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { BottomNav } from './components/BottomNav';
import { FeedScreen } from './screens/FeedScreen';
import { SavedScreen } from './screens/SavedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PromptEditorScreen } from './screens/PromptEditorScreen';
import { NewPromptScreen } from './screens/NewPromptScreen';

export default function App() {
  const activeTab = useStore((s) => s.activeTab);
  const editorPromptId = useStore((s) => s.editorPromptId);
  const newPromptOpen = useStore((s) => s.newPromptOpen);
  const initAuth = useStore((s) => s.initAuth);
  const loadPrompts = useStore((s) => s.loadPrompts);

  useEffect(() => {
    initAuth();
    loadPrompts();
  }, [initAuth, loadPrompts]);

  return (
    <div className="fixed inset-0 bg-surface-0 font-body text-white overflow-hidden select-none">
      {/* Screen content */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {activeTab === 'feed' && <FeedScreen />}
          {activeTab === 'saved' && <SavedScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Editor screen overlay */}
      <AnimatePresence>
        {editorPromptId && <PromptEditorScreen />}
      </AnimatePresence>

      {/* New prompt screen overlay */}
      <AnimatePresence>
        {newPromptOpen && <NewPromptScreen />}
      </AnimatePresence>
    </div>
  );
}
