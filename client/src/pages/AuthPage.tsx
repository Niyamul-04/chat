import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { MessageSquare, Shield, Zap, Sparkles } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-indigo-50/50 via-slate-50 to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 relative overflow-hidden select-none">
      {/* Background Ambience Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Top Bar with Brand & Theme Toggle */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ChatSphere
          </span>
        </div>

        <ThemeToggle />
      </header>

      {/* Auth Card */}
      <div className="w-full max-w-md mt-16 sm:mt-12 z-10">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/5">
          {/* Card Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {mode === 'login'
                ? 'Sign in with your unique User ID to continue chatting.'
                : 'Choose a unique User ID so your friends can find you.'}
            </p>
          </div>

          {/* Form Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <LoginForm onSwitchToSignup={() => setMode('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="mt-8 flex items-center justify-center space-x-6 text-slate-400 text-xs">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span>Real-time</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Encrypted WebRTC</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Friends-Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
