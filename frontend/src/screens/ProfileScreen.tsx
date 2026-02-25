import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { hapticLight, hapticMedium } from '../utils/haptics';

export function ProfileScreen() {
  const user = useStore((s) => s.user);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const logout = useStore((s) => s.logout);
  const openNewPrompt = useStore((s) => s.openNewPrompt);
  const savedPrompts = useStore((s) => s.savedPrompts);
  const prompts = useStore((s) => s.prompts);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const handleSubmit = async () => {
    hapticMedium();
    if (isRegisterMode) {
      await register(email, password, name);
    } else {
      await login(email, password);
    }
  };

  // ── NOT LOGGED IN ─────────────────────────────────────
  if (!user) {
    const submitButtonLabel = isRegisterMode ? 'Create Account' : 'Sign In';

    return (
      <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="px-5 pt-14 pb-4">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Profile</h1>
          </div>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="px-5 py-8 pb-32 space-y-5"
        >
          {/* Welcome card */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/30 via-accent-violet/10 to-purple-900/20" />
            <div className="absolute inset-0 border border-accent-violet/15 rounded-3xl" />
            <div className="relative p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-violet/20 border border-accent-violet/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-1">
                {isRegisterMode ? 'Create Account' : 'Welcome Back'}
              </h3>
              <p className="font-body text-sm text-white/40">
                {isRegisterMode ? 'Sign up to save and manage your prompts' : 'Sign in to access your saved prompts'}
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div variants={fadeUp} className="space-y-3">
            {isRegisterMode && (
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
            />

            {authError && (
              <p className="text-center text-xs text-accent-rose font-body">{authError}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={authLoading || !email || !password}
              className="w-full py-3.5 rounded-2xl bg-accent-violet font-display text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isRegisterMode ? 'Creating...' : 'Signing in...'}
                </span>
              ) : submitButtonLabel}
            </button>

            <button
              onClick={() => {
                hapticLight();
                setIsRegisterMode(!isRegisterMode);
                useStore.setState({ authError: null });
              }}
              className="w-full py-2 font-body text-sm text-white/40"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </motion.div>

          {/* Version */}
          <motion.p
            variants={fadeUp}
            className="text-center font-mono text-[10px] text-white/15 pt-4"
          >
            Prompterest v1.0.0
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── LOGGED IN ─────────────────────────────────────────
  return (
    <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="px-5 pt-14 pb-4">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Profile</h1>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 py-4 pb-32 space-y-4"
      >
        {/* Profile Card */}
        <motion.div variants={fadeUp} className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/30 via-accent-violet/10 to-purple-900/20" />
          <div className="absolute inset-0 border border-accent-violet/15 rounded-3xl" />
          <div className="relative p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-violet/20 border border-accent-violet/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold text-white truncate">
                  {user.email}
                </h3>
                <p className="font-body text-xs text-white/30 mt-0.5">
                  Member since 2026
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex-1 text-center">
                <p className="font-display text-xl font-bold text-white">{prompts.length}</p>
                <p className="font-body text-xs text-white/30 mt-0.5">Prompts</p>
              </div>
              <div className="w-px bg-white/[0.06]" />
              <div className="flex-1 text-center">
                <p className="font-display text-xl font-bold text-white">{savedPrompts.length}</p>
                <p className="font-body text-xs text-white/30 mt-0.5">Saved</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* New Prompt */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              hapticMedium();
              openNewPrompt();
            }}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-accent-violet/15 border border-accent-violet/20 font-display text-sm font-semibold text-accent-violet active:scale-[0.98] transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Prompt
          </button>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              hapticMedium();
              logout();
            }}
            className="w-full py-3.5 rounded-2xl bg-accent-rose/10 border border-accent-rose/15 font-display text-sm font-semibold text-accent-rose active:scale-[0.98] transition-transform"
          >
            Sign Out
          </button>
        </motion.div>

        {/* Version */}
        <motion.p
          variants={fadeUp}
          className="text-center font-mono text-[10px] text-white/15 pt-2"
        >
          Prompterest v1.0.0
        </motion.p>
      </motion.div>
    </div>
  );
}
