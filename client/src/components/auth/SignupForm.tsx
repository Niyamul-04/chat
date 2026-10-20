import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Lock, User as UserIcon, Smile, Loader2, Check, AlertCircle, Mail } from 'lucide-react';
import { GoogleAuthModal } from './GoogleAuthModal';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Password strength calculation
  const strength = useMemo(() => {
    if (!password) return { score: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: 'bg-rose-500', width: 'w-1/3' };
    if (score <= 4) return { score: 2, text: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
    return { score: 3, text: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (username.length < 3) {
      setValidationError('User ID must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      setValidationError('User ID can only contain letters, numbers, underscores, and dots.');
      return;
    }
    if (displayName.trim().length < 2) {
      setValidationError('Display name must be at least 2 characters.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    await signup(username.trim().toLowerCase(), displayName.trim(), password, email.trim() || undefined);
  };

  const activeError = validationError || error;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {activeError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{activeError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setValidationError('');
                clearError();
              }}
              className="text-xs font-semibold hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google OAuth Signup Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-xs transition flex items-center justify-center space-x-2.5 active:scale-[0.99]"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
          <span>Sign up with Google Account</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            or register manually
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            User ID (Unique Username)
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Display Name
          </label>
          <div className="relative">
            <Smile className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Email Address (Optional)
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="email"
              placeholder="e.g. john@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password Strength Meter */}
        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Strength:</span>
              <span
                className={`font-semibold ${
                  strength.score === 1
                    ? 'text-rose-500'
                    : strength.score === 2
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {strength.text}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`} />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm"
          />
          {confirmPassword && password === confirmPassword && (
            <Check className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !username || !displayName || !password || !confirmPassword}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white font-semibold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating your account...</span>
          </>
        ) : (
          <span>Create ChatSphere Account</span>
        )}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
        Already registered?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Sign in
        </button>
        </p>
      </form>

      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </>
  );
};
