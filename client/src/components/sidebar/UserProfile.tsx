import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';
import { Camera, Save, Lock, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyUserId = () => {
    if (!user?.username) return;
    navigator.clipboard.writeText(user.username);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Avatar must be less than 10MB.' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const res = await api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.avatarUrl) {
        await updateProfile({ avatarUrl: res.data.avatarUrl });
        setProfileMsg({ type: 'success', text: 'Avatar updated!' });
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to upload avatar.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsUpdatingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ displayName: displayName.trim(), bio: bio.trim() });
      setProfileMsg({ type: 'success', text: 'Profile saved successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMsg(null);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Avatar Header */}
      <div className="flex flex-col items-center text-center">
        <div className="relative group">
          <Avatar
            name={user?.displayName || 'User'}
            src={user?.avatarUrl}
            size="2xl"
            className="ring-4 ring-indigo-500/20 shadow-lg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-90"
            title="Upload new avatar"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>

        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
          {user?.displayName}
        </h3>
        <div className="mt-1.5 flex flex-col items-center">
          <button
            type="button"
            onClick={handleCopyUserId}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 transition active:scale-95 shadow-xs"
            title="Click to copy your unique User ID to clipboard"
          >
            <span>@{user?.username}</span>
            {copiedId ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {copiedId && (
            <span className="text-[11px] text-emerald-500 font-semibold mt-1 animate-fadeIn">
              User ID copied to clipboard! Share with friends
            </span>
          )}
        </div>
      </div>

      {profileMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
            profileMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          {profileMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell friends a bit about yourself..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-slate-900 dark:text-slate-100 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isUpdatingProfile}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm transition disabled:opacity-50"
        >
          {isUpdatingProfile ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Profile Changes</span>
        </button>
      </form>

      {/* Change Password Section */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Security & Password</span>
        </h4>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            {isChangingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>Update Password</span>
          </button>
        </form>
      </div>

      {/* Developer Attribution Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-50/80 to-purple-50/80 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-2 select-none shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          ChatSphere v2.0
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Crafted & Developed with ❤️ by
        </p>
        <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25">
          <span>Niyamul Hasan</span>
        </div>
        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 pt-0.5">
          Real-time messaging, WebRTC calling & file sharing
        </p>
      </div>
    </div>
  );
};
