import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Lock, User as UserIcon, Smile, Loader2, Check, AlertCircle } from 'lucide-react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    await signup(username.trim().toLowerCase(), displayName.trim(), password);
  };

  const activeError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {activeError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
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

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          User ID (Unique Username)
        </label>
        <div className="relative">
          <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            required
            placeholder="e.g. johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm"
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Friends will use this ID to find and add you.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          Display Name
        </label>
        <div className="relative">
          <Smile className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            required
            placeholder="e.g. John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm"
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
  );
};
