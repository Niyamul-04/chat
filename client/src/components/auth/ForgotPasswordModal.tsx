import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Mail, Lock, KeyRound, Loader2, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { forgotPassword, resetPassword, isLoading } = useAuthStore();

  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your User ID or Email address.');
      return;
    }

    const res = await forgotPassword(identifier.trim());
    if (res.success) {
      if (res.resetCode) {
        setResetCode(res.resetCode);
        setInfoMsg(`Reset code generated: ${res.resetCode}`);
      } else {
        setInfoMsg(res.message);
      }
      setStep('RESET');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!resetCode.trim()) {
      setErrorMsg('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = await resetPassword(identifier.trim(), resetCode.trim(), newPassword);
    if (res.success) {
      setStep('SUCCESS');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleResetAll = () => {
    setStep('REQUEST');
    setIdentifier('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setInfoMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={handleResetAll}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'REQUEST' && 'Reset Your Password'}
            {step === 'RESET' && 'Enter Verification Code'}
            {step === 'SUCCESS' && 'Password Changed!'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {step === 'REQUEST' && 'Enter your User ID or Email to receive a 6-digit reset code.'}
            {step === 'RESET' && 'Enter the reset code and create your new secure password.'}
            {step === 'SUCCESS' && 'Your account password has been updated successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
            {infoMsg}
          </div>
        )}

        {/* STEP 1: Enter Username or Email */}
        {step === 'REQUEST' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                User ID or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. alice or alice@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking account...</span>
                </>
              ) : (
                <>
                  <span>Get Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter Code & New Password */}
        {step === 'RESET' && (
          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                required
                placeholder="123456"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="w-full px-4 py-2.5 text-center tracking-widest font-mono text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !resetCode || !newPassword || !confirmPassword}
                className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === 'SUCCESS' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your password has been reset successfully! You can now sign in to ChatSphere with your new credentials.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
