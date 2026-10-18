import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../common/Avatar';
import { Search, MessageSquare, Phone, Video, MoreVertical, UserMinus, ShieldAlert, Users } from 'lucide-react';
import { User } from '../../types';

export const FriendsList: React.FC = () => {
  const { friends, setActiveFriend, unfriend, blockUser, onlineUserIds, setActiveTab } = useChatStore();
  const { startCall } = useCallStore();
  const [filterQuery, setFilterQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredFriends = friends.filter((item) => {
    const q = filterQuery.toLowerCase();
    return (
      item.friend.displayName.toLowerCase().includes(q) ||
      item.friend.username.toLowerCase().includes(q)
    );
  });

  const handleStartChat = (friend: User) => {
    setActiveFriend(friend);
    setActiveTab('chats');
  };

  const handleCall = (friend: User, type: 'AUDIO' | 'VIDEO') => {
    startCall(friend, type);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search friends..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No friends yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Add users using their User ID to unlock chatting, audio and video calls.
            </p>
            <button
              onClick={() => setActiveTab('search')}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
            >
              Add Friends
            </button>
          </div>
        ) : (
          filteredFriends.map(({ friend }) => {
            const isOnline = onlineUserIds.includes(friend.id) || friend.status === 'ONLINE';
            const isMenuOpen = activeMenuId === friend.id;

            return (
              <div
                key={friend.id}
                className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition relative group"
              >
                <div
                  onClick={() => handleStartChat(friend as User)}
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                >
                  <Avatar
                    name={friend.displayName}
                    src={friend.avatarUrl}
                    size="md"
                    isOnline={isOnline}
                    showOnlineStatus
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {friend.displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">@{friend.username}</p>
                  </div>
                </div>

                {/* Friend Quick Actions */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleStartChat(friend as User)}
                    title="Chat"
                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCall(friend as User, 'AUDIO')}
                    title="Audio Call"
                    className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCall(friend as User, 'VIDEO')}
                    title="Video Call"
                    className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(isMenuOpen ? null : friend.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-20 text-xs">
                        <button
                          onClick={() => {
                            unfriend(friend.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Unfriend</span>
                        </button>
                        <button
                          onClick={() => {
                            blockUser(friend.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Block User</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
