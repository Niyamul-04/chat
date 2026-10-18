import React from 'react';
import { getMediaUrl } from '../../services/api';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const indicatorSize = {
    xs: 'w-1.5 h-1.5 right-0 bottom-0',
    sm: 'w-2 h-2 right-0 bottom-0',
    md: 'w-2.5 h-2.5 right-0.5 bottom-0.5',
    lg: 'w-3 h-3 right-0.5 bottom-0.5',
    xl: 'w-3.5 h-3.5 right-1 bottom-1',
    '2xl': 'w-5 h-5 right-1.5 bottom-1.5',
  };

  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const resolvedUrl = src ? getMediaUrl(src) : '';

  return (
    <div className={`relative inline-block select-none flex-shrink-0 ${className}`}>
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20 shadow-sm`}
          onError={(e) => {
            // fallback to initials on error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white font-semibold flex items-center justify-center shadow-sm ring-2 ring-white/20`}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span
          className={`absolute ${indicatorSize[size]} rounded-full ring-2 ring-white dark:ring-slate-900 ${
            isOnline ? 'bg-emerald-500 ring-emerald-500/30 animate-pulse' : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
};
