import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common/Avatar';
import { Check, X, Clock, UserCheck, Inbox } from 'lucide-react';

export const RequestsList: React.FC = () => {
  const {
    receivedRequests,
    sentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
  } = useChatStore();

  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab Switcher */}
      <div className="p-3">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setSubTab('received')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
              subTab === 'received'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Received</span>
            {receivedRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('sent')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
              subTab === 'sent'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Sent</span>
            {sentRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-300 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                {sentRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {subTab === 'received' ? (
          receivedRequests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pending requests</p>
              <p className="text-xs text-slate-400 mt-1">
                When someone sends you a friend request, it will show up here.
              </p>
            </div>
          ) : (
            receivedRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    name={req.sender?.displayName || 'User'}
                    src={req.sender?.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {req.sender?.displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">@{req.sender?.username}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                  <button
                    onClick={() => acceptFriendRequest(req.id)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => declineFriendRequest(req.id)}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center justify-center space-x-1 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))
          )
        ) : sentRequests.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No sent requests</p>
            <p className="text-xs text-slate-400 mt-1">
              Friend requests you send to other users will appear here until accepted.
            </p>
          </div>
        ) : (
          sentRequests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Avatar
                  name={req.receiver?.displayName || 'User'}
                  src={req.receiver?.avatarUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {req.receiver?.displayName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">@{req.receiver?.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Pending
                </span>
                <button
                  onClick={() => cancelFriendRequest(req.id)}
                  title="Cancel Request"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
