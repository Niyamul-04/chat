import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { GoogleAuthModal } from './GoogleAuthModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await login(username.trim(), password);
  };

  const handleQuickLogin = async (user: string) => {
    setUsername(user);
    setPassword('Password123!');
    await login(user, 'Password123!');
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between animate-fadeIn">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-xs font-semibold hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-xs transition flex items-center justify-center space-x-3 active:scale-[0.99]"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            or sign in with password
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            User ID or Email
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="e.g. alice or alice@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !username || !password}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white font-semibold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In to ChatSphere</span>
          )}
        </button>

        {/* Demo Accounts Quick-Fill Helper */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            Quick Demo Login (Password: Password123!)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['alice', 'bob', 'charlie'].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => handleQuickLogin(u)}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition capitalize"
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-1">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Create one now
          </button>
        </p>
      </form>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </>
  );
};
