import React, { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../common/Avatar';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Sparkles,
} from 'lucide-react';

export const ActiveCallModal: React.FC = () => {
  const {
    callState,
    callType,
    targetUser,
    isMuted,
    isCameraOff,
    duration,
    localStream,
    remoteStream,
    toggleMute,
    toggleCamera,
    endCall,
    callError,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioVideoRef = useRef<HTMLVideoElement>(null);

  // Draggable PiP state
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Attach remote stream to video element (for video calls)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && callType === 'VIDEO') {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callState, callType]);

  // Attach remote stream to audio and backup media elements (guarantees voice playback)
  useEffect(() => {
    if (!remoteStream) return;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play().catch((err) => {
        console.warn('Audio auto-play error, waiting for user gesture:', err);
      });
    }

    if (remoteAudioVideoRef.current) {
      remoteAudioVideoRef.current.srcObject = remoteStream;
      remoteAudioVideoRef.current.muted = false;
      remoteAudioVideoRef.current.volume = 1.0;
      remoteAudioVideoRef.current.play().catch(() => {});
    }

    // Auto-unlock audio playback on first user gesture if browser autoplay blocked it
    const unlockAudio = () => {
      remoteAudioRef.current?.play().catch(() => {});
      remoteAudioVideoRef.current?.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
  }, [remoteStream, callState, callType]);

  if ((callState !== 'OUTGOING' && callState !== 'CONNECTED') || !targetUser) {
    if (callError) {
      return (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-fadeIn">
          <p className="text-sm font-semibold">{callError}</p>
        </div>
      );
    }
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pipPos.x,
      initY: pipPos.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPipPos({
      x: Math.max(10, Math.min(window.innerWidth - 180, dragRef.current.initX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 240, dragRef.current.initY + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 select-none animate-fadeIn"
    >
      {/* Off-screen audio & video elements dedicated to playing remote audio stream without display:none */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />
      <video
        ref={remoteAudioVideoRef}
        autoPlay
        playsInline
        muted={false}
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between text-white z-20">
        <div className="flex items-center space-x-3">
          <Avatar name={targetUser.displayName} src={targetUser.avatarUrl} size="md" />
          <div>
            <h3 className="font-bold text-base leading-tight">{targetUser.displayName}</h3>
            <p className="text-xs text-slate-400">
              {callState === 'OUTGOING' ? 'Calling...' : `Connected (${formatDuration(duration)})`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
            {callType === 'VIDEO' ? 'HD Video Call' : 'Encrypted Audio Call'}
          </span>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden my-4 rounded-3xl bg-slate-900 border border-slate-800">
        {callType === 'VIDEO' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-3xl"
          />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
              <Avatar
                name={targetUser.displayName}
                src={targetUser.avatarUrl}
                size="2xl"
                className="ring-8 ring-indigo-500/30 shadow-2xl"
              />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{targetUser.displayName}</h2>
              <p className="text-sm text-indigo-400 mt-1 flex items-center justify-center space-x-1.5 font-medium">
                {callState === 'OUTGOING' ? (
                  <span>Ringing...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>In call ({formatDuration(duration)})</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Draggable Local Video PiP (for video calls) */}
        {callType === 'VIDEO' && localStream && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              left: `${pipPos.x}px`,
              top: `${pipPos.y}px`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            className="w-36 h-48 sm:w-44 sm:h-56 rounded-2xl bg-black border-2 border-indigo-500/60 shadow-2xl overflow-hidden z-30 transition-shadow hover:shadow-indigo-500/20"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
            />
            {isCameraOff && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
                <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white">
              You
            </div>
          </div>
        )}
      </div>

      {/* In-Call Controls Dock */}
      <div className="flex items-center justify-center space-x-4 py-2 z-20">
        {/* Mute Mic */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition active:scale-95 shadow-lg ${
            isMuted
              ? 'bg-rose-600/20 text-rose-500 border border-rose-500/40 hover:bg-rose-600/30'
              : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Camera Toggle (Video Call Only) */}
        {callType === 'VIDEO' && (
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-2xl transition active:scale-95 shadow-lg ${
              isCameraOff
                ? 'bg-rose-600/20 text-rose-500 border border-rose-500/40 hover:bg-rose-600/30'
                : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* End Call */}
        <button
          onClick={() => endCall('COMPLETED')}
          className="p-4 px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-xl shadow-rose-600/40 transition flex items-center space-x-2 font-semibold"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
          <span>End</span>
        </button>
      </div>
    </div>
  );
};
