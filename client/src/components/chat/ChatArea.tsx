import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../common/Avatar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { api } from '../../services/api';
import {
  Phone,
  Video,
  ArrowLeft,
  MoreVertical,
  UserMinus,
  ShieldAlert,
  Lock,
  UserPlus,
  Clock,
  Sparkles,
  PhoneIncoming,
} from 'lucide-react';
import { User } from '../../types';

export const ChatArea: React.FC = () => {
  const {
    activeFriend,
    setActiveFriend,
    friends,
    messages,
    hasMoreMessages,
    fetchMessages,
    typingUsers,
    onlineUserIds,
    unfriend,
    blockUser,
    sendFriendRequest,
  } = useChatStore();

  const { startCall } = useCallStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE'>('FRIENDS');
  const [isCheckingFriendship, setIsCheckingFriendship] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);

  // Check friendship status when active user changes
  useEffect(() => {
    if (!activeFriend) return;

    // Check locally first
    const isLocalFriend = friends.some((f) => f.friend.id === activeFriend.id);
    if (isLocalFriend) {
      setFriendshipStatus('FRIENDS');
      return;
    }

    // Verify with server
    const checkStatus = async () => {
      setIsCheckingFriendship(true);
      try {
        const res = await api.get(`/friends/status/${activeFriend.id}`);
        setFriendshipStatus(res.data?.status || 'NONE');
      } catch (err) {
        setFriendshipStatus('NONE');
      } finally {
        setIsCheckingFriendship(false);
      }
    };

    checkStatus();
  }, [activeFriend, friends]);

  // Fetch call history
  useEffect(() => {
    if (activeFriend && showCallHistory && friendshipStatus === 'FRIENDS') {
      api.get(`/calls/history/${activeFriend.id}`)
        .then((res) => setCallHistory(res.data.calls || []))
        .catch(() => {});
    }
  }, [activeFriend, showCallHistory, friendshipStatus]);

  if (!activeFriend) {
    return (
      <main className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/50 select-none">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 shadow-xl border border-indigo-500/20 animate-pulse">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Welcome to ChatSphere
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
          Select a conversation from the sidebar or search for users by User ID to start chatting and calling.
        </p>

        {/* Developer Attribution Badge */}
        <div className="mt-8 p-3 px-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md flex flex-col items-center space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Developed & Engineered by
          </span>
          <span className="text-base font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Niyamul Hasan
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-Time Socket.IO • WebRTC Voice & Video • Instant Delivery
          </span>
        </div>
      </main>
    );
  }

  const isFriend = friendshipStatus === 'FRIENDS';
  const isOnline = onlineUserIds.includes(activeFriend.id) || activeFriend.status === 'ONLINE';
  const currentFriendMessages = messages[activeFriend.id] || [];
  const hasMore = hasMoreMessages[activeFriend.id] || false;
  const isTyping = !!typingUsers[activeFriend.id];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isFriend) setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!isFriend) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds the 10MB limit.');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await api.post('/uploads/chat', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { url, fileName, fileSize, type } = res.data;
        useChatStore.getState().sendMessage({
          receiverId: activeFriend.id,
          type,
          fileUrl: url,
          fileName,
          fileSize,
        });
      } catch (err) {
        console.error('Drag drop upload failed:', err);
      }
    }
  };

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-indigo-600/20 backdrop-blur-xs border-4 border-dashed border-indigo-500 rounded-2xl m-4 flex flex-col items-center justify-center animate-fadeIn pointer-events-none">
          <Sparkles className="w-12 h-12 text-indigo-500 mb-2 animate-bounce" />
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Drop file to send instantly
          </p>
          <p className="text-xs text-slate-500">Max size 10MB</p>
        </div>
      )}

      {/* Chat Area Header */}
      <header className="p-3.5 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={() => setActiveFriend(null)}
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar
            name={activeFriend.displayName}
            src={activeFriend.avatarUrl}
            size="md"
            isOnline={isOnline}
            showOnlineStatus={isFriend}
          />

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {activeFriend.displayName}
              </h3>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md flex items-center space-x-1">
                <span>@{activeFriend.username}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {!isFriend
                ? 'Not in friends list yet'
                : isOnline
                ? 'Online'
                : activeFriend.lastSeenAt
                ? `Last seen ${new Date(activeFriend.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Audio Call */}
          <button
            onClick={() => startCall(activeFriend, 'AUDIO')}
            disabled={!isFriend}
            title={isFriend ? 'Start Audio Call' : 'Only friends can call'}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => startCall(activeFriend, 'VIDEO')}
            disabled={!isFriend}
            title={isFriend ? 'Start Video Call' : 'Only friends can call'}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Video className="w-5 h-5" />
          </button>

          {/* Call History Toggle */}
          <button
            onClick={() => setShowCallHistory(!showCallHistory)}
            title="Call History"
            disabled={!isFriend}
            className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition active:scale-95 disabled:opacity-40"
          >
            <PhoneIncoming className="w-5 h-5" />
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-30 text-xs animate-fadeIn">
                {isFriend ? (
                  <>
                    <button
                      onClick={() => {
                        unfriend(activeFriend.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>Unfriend User</span>
                    </button>
                    <button
                      onClick={() => {
                        blockUser(activeFriend.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Block User</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      sendFriendRequest(activeFriend.username);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Send Friend Request</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Call History Slide-out Drawer */}
      {showCallHistory && (
        <div className="absolute top-14 right-0 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-b border-slate-200 dark:border-slate-800 z-20 p-4 shadow-xl max-h-96 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Call History</h4>
            <button
              onClick={() => setShowCallHistory(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          {callHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No previous calls recorded.</p>
          ) : (
            <div className="space-y-2">
              {callHistory.map((call) => (
                <div key={call.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      {call.type === 'VIDEO' ? <Video className="w-3.5 h-3.5 text-purple-500" /> : <Phone className="w-3.5 h-3.5 text-emerald-500" />}
                      <span>{call.type} Call</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {new Date(call.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      call.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                      call.status === 'MISSED' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      {call.status}
                    </span>
                    {call.durationSeconds > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{call.durationSeconds}s</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NON-FRIEND RESTRICTION BANNER */}
      {!isFriend && (
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Friendship Required
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can only chat, share files, or make audio and video calls once you become accepted friends.
              </p>
            </div>
          </div>

          {friendshipStatus === 'NONE' && (
            <button
              onClick={() => sendFriendRequest(activeFriend.username)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex-shrink-0 flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Send Request</span>
            </button>
          )}

          {friendshipStatus === 'REQUEST_SENT' && (
            <span className="py-1.5 px-3 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center space-x-1 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>Request Pending</span>
            </span>
          )}

          {friendshipStatus === 'REQUEST_RECEIVED' && (
            <button
              onClick={async () => {
                const reqs = await api.get('/friends/requests');
                const req = reqs.data.received?.find((r: any) => r.senderId === activeFriend.id);
                if (req) {
                  await useChatStore.getState().acceptFriendRequest(req.id);
                  setFriendshipStatus('FRIENDS');
                }
              }}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition flex-shrink-0 flex items-center space-x-1.5 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Accept Request</span>
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <MessageList
        friend={activeFriend}
        messages={currentFriendMessages}
        hasMore={hasMore}
        onLoadMore={() => fetchMessages(activeFriend.id, false)}
        isTyping={isTyping}
      />

      {/* Input Bar (disabled if not friends) */}
      <ChatInput friendId={activeFriend.id} isDisabled={!isFriend} />
    </main>
  );
};
