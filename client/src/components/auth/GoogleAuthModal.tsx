import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Mail, User, Lock, Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const { googleLogin, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid Gmail or Google account address.');
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('Password is required and must be at least 6 characters.');
      return;
    }

    const success = await googleLogin({
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      password: password.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail.split('@')[0]}`,
    });

    if (success) {
      onClose();
    }
  };

  const handleQuickGoogleAccount = async (presetEmail: string, presetName: string) => {
    setEmail(presetEmail);
    setDisplayName(presetName);
    setPassword('google123456');
    const success = await googleLogin({
      email: presetEmail,
      displayName: presetName,
      password: 'google123456',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${presetEmail.split('@')[0]}`,
    });
    if (success) {
      onClose();
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
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
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sign in with Google</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connect your Gmail or Google Account to ChatSphere instantly
          </p>
        </div>

        {activeError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{activeError}</span>
            <button
              type="button"
              onClick={() => {
                setLocalError('');
                clearError();
              }}
              className="text-xs font-semibold hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Google / Gmail Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Your Name (Optional)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Account Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Set password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Required to protect your Google account and allow password logins.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] font-semibold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Google Accounts */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-center text-slate-400 mb-2 font-medium flex items-center justify-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Or quick-sign with demo Google accounts:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickGoogleAccount('alice.google@gmail.com', 'Alice Morgan')}
              className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-center truncate transition"
            >
              alice.google@gmail.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickGoogleAccount('bob.google@gmail.com', 'Bob Vance')}
              className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-center truncate transition"
            >
              bob.google@gmail.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
