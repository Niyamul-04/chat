import React from 'react';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../common/Avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { callState, callType, targetUser, acceptCall, rejectCall } = useCallStore();

  if (callState !== 'INCOMING' || !targetUser) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900/90 border border-slate-700/80 p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Pulsing visual glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
          <Avatar
            name={targetUser.displayName}
            src={targetUser.avatarUrl}
            size="2xl"
            className="ring-4 ring-indigo-500 shadow-2xl"
          />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">{targetUser.displayName}</h3>
        <p className="text-xs text-slate-400 mb-2">@{targetUser.username}</p>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8 border border-indigo-500/30 animate-pulse">
          {callType === 'VIDEO' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span>Incoming {callType === 'VIDEO' ? 'Video' : 'Audio'} Call...</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-8">
          {/* Decline */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition animate-bounce"
              title="Accept"
            >
              {callType === 'VIDEO' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] text-slate-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
