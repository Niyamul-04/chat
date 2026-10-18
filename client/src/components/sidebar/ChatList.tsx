import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common/Avatar';
import { Search, Image as ImageIcon, FileText, MessageSquarePlus } from 'lucide-react';
import { User } from '../../types';

export const ChatList: React.FC = () => {
  const { friends, activeFriend, setActiveFriend, onlineUserIds, setActiveTab } = useChatStore();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredFriends = friends.filter((item) => {
    const q = filterQuery.toLowerCase();
    return (
      item.friend.displayName.toLowerCase().includes(q) ||
      item.friend.username.toLowerCase().includes(q)
    );
  });

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Filter */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-3">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No chats yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Connect with friends to start chatting and calling in real-time.
            </p>
            <button
              onClick={() => setActiveTab('search')}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
            >
              Find Users by ID
            </button>
          </div>
        ) : (
          filteredFriends.map(({ friend, lastMessage, unreadCount }) => {
            const isSelected = activeFriend?.id === friend.id;
            const isOnline = onlineUserIds.includes(friend.id) || friend.status === 'ONLINE';

            return (
              <button
                key={friend.id}
                onClick={() => setActiveFriend(friend as User)}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 transition text-left relative group ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-500/30 shadow-sm'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Avatar
                  name={friend.displayName}
                  src={friend.avatarUrl}
                  size="md"
                  isOnline={isOnline}
                  showOnlineStatus
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
                      {friend.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2 flex-shrink-0">
                      {formatMessageTime(lastMessage?.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                      {lastMessage?.type === 'IMAGE' && (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500 mr-1 flex-shrink-0" />
                          <span>Photo</span>
                        </>
                      )}
                      {lastMessage?.type === 'FILE' && (
                        <>
                          <FileText className="w-3.5 h-3.5 text-indigo-500 mr-1 flex-shrink-0" />
                          <span>Document</span>
                        </>
                      )}
                      {(!lastMessage?.type || lastMessage?.type === 'TEXT') && (
                        <span>{lastMessage?.content || `@${friend.username}`}</span>
                      )}
                    </p>

                    {unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
