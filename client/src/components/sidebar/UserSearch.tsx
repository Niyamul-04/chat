import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common/Avatar';
import {
  Search,
  UserPlus,
  Check,
  Clock,
  MessageSquare,
  Loader2,
  Copy,
  CheckCheck,
  Users,
  Sparkles,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { User } from '../../types';

interface SearchResultUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: 'ONLINE' | 'OFFLINE';
  relationship: 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'BLOCKED';
  requestId?: string;
  createdAt?: string;
}

export const UserSearch: React.FC = () => {
  const { user } = useAuthStore();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    setActiveFriend,
    setActiveTab,
  } = useChatStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'unconnected'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch users on mount or query change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/users/search', { params: { q: query.trim() } });
        if (!isCancelled) {
          setResults(res.data.users || []);
        }
      } catch (err) {
        console.error('Fetch users error:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }, query.trim() ? 250 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const copyToClipboard = (text: string, isMyId = false) => {
    navigator.clipboard.writeText(text);
    if (isMyId) {
      setCopiedMyId(true);
      setTimeout(() => setCopiedMyId(false), 2000);
    } else {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSendRequest = async (targetUser: SearchResultUser) => {
    setActionLoadingId(targetUser.id);
    const res = await sendFriendRequest(targetUser.username);
    setActionLoadingId(null);

    if (res.success) {
      setNotification({ type: 'success', text: res.message });
      setResults((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, relationship: res.autoAccepted ? 'FRIENDS' : 'REQUEST_SENT' }
            : u
        )
      );
    } else {
      setNotification({ type: 'error', text: res.message });
    }
  };

  const handleAccept = async (targetUser: SearchResultUser) => {
    if (!targetUser.requestId) return;
    setActionLoadingId(targetUser.id);
    await acceptFriendRequest(targetUser.requestId);
    setActionLoadingId(null);
    setResults((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, relationship: 'FRIENDS' } : u))
    );
  };

  const handleCancel = async (targetUser: SearchResultUser) => {
    if (!targetUser.requestId) return;
    setActionLoadingId(targetUser.id);
    await cancelFriendRequest(targetUser.requestId);
    setActionLoadingId(null);
    setResults((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, relationship: 'NONE' } : u))
    );
  };

  // Filter items
  const filteredUsers = results.filter((u) => {
    if (filterMode === 'online') return u.status === 'ONLINE';
    if (filterMode === 'unconnected') return u.relationship === 'NONE';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/40 dark:bg-slate-900/40">
      {/* Top Banner: Your Own User ID */}
      <div className="p-3 pb-2">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Your Public User ID
              </span>
              <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 truncate block">
                @{user?.username}
              </span>
            </div>

            <button
              onClick={() => user?.username && copyToClipboard(`@${user.username}`, true)}
              className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center space-x-1.5 transition flex-shrink-0"
              title="Copy your User ID"
            >
              {copiedMyId ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center space-x-1">
            <Share2 className="w-3 h-3 flex-shrink-0 opacity-70" />
            <span>Share your ID with anyone to receive friend requests.</span>
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by User ID (e.g. alice, bob)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 transition shadow-xs"
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          )}
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="px-3 pb-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterMode('all')}
          className={`py-1 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            filterMode === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
          }`}
        >
          All Members ({results.length})
        </button>
        <button
          onClick={() => setFilterMode('online')}
          className={`py-1 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1 ${
            filterMode === 'online'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Online</span>
        </button>
        <button
          onClick={() => setFilterMode('unconnected')}
          className={`py-1 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            filterMode === 'unconnected'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
          }`}
        >
          Not Friends Yet
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`mx-3 mb-2 p-2.5 rounded-xl text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-[10px] font-bold uppercase ml-2 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Notice on Friendship Policy */}
      <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          Users can only chat, share media, or call once a friend request is accepted.
        </span>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4">
        {isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">Loading ChatSphere members...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching members found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try searching with another keyword or User ID.
            </p>
          </div>
        ) : (
          filteredUsers.map((targetUser) => {
            const isActing = actionLoadingId === targetUser.id;
            const isOnline = targetUser.status === 'ONLINE';

            return (
              <div
                key={targetUser.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                    <Avatar
                      name={targetUser.displayName}
                      src={targetUser.avatarUrl}
                      size="md"
                      isOnline={isOnline}
                      showOnlineStatus
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {targetUser.displayName}
                        </span>
                      </div>

                      {/* Prominent User ID with 1-click Copy */}
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                          @{targetUser.username}
                        </span>
                        <button
                          onClick={() => copyToClipboard(`@${targetUser.username}`)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                          title="Copy User ID"
                        >
                          {copiedId === `@${targetUser.username}` ? (
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Relationship Action Button */}
                  <div className="flex-shrink-0">
                    {targetUser.relationship === 'FRIENDS' && (
                      <button
                        onClick={() => {
                          setActiveFriend(targetUser as User);
                          setActiveTab('chats');
                        }}
                        className="py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center space-x-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}

                    {targetUser.relationship === 'REQUEST_SENT' && (
                      <button
                        onClick={() => handleCancel(targetUser)}
                        disabled={isActing}
                        className="py-1.5 px-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center space-x-1 hover:bg-rose-500/10 hover:text-rose-600 transition"
                        title="Click to cancel friend request"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Requested</span>
                      </button>
                    )}

                    {targetUser.relationship === 'REQUEST_RECEIVED' && (
                      <button
                        onClick={() => handleAccept(targetUser)}
                        disabled={isActing}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-xs transition active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    )}

                    {targetUser.relationship === 'BLOCKED' && (
                      <span className="py-1 px-2.5 rounded-lg bg-rose-500/10 text-rose-500 text-xs font-medium">
                        Blocked
                      </span>
                    )}

                    {targetUser.relationship === 'NONE' && (
                      <button
                        onClick={() => handleSendRequest(targetUser)}
                        disabled={isActing}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition disabled:opacity-50"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                </div>

                {targetUser.bio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl leading-relaxed">
                    "{targetUser.bio}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
