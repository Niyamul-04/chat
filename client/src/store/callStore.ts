import { create } from 'zustand';
import { User, CallState, CallType } from '../types';
import { getSocket } from '../services/socket';
import { webrtc } from '../services/webrtc';
import { sounds } from '../services/sounds';

interface CallStoreState {
  callState: CallState;
  callType: CallType;
  targetUser: User | null;
  isMuted: boolean;
  isCameraOff: boolean;
  duration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  timerIntervalId: number | null;
  callError: string | null;

  startCall: (targetUser: User, type: CallType) => Promise<void>;
  receiveIncomingCall: (caller: User, type: CallType) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (status?: 'COMPLETED' | 'MISSED' | 'REJECTED' | 'BUSY') => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setRemoteStream: (stream: MediaStream) => void;
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  callState: 'IDLE',
  callType: 'AUDIO',
  targetUser: null,
  isMuted: false,
  isCameraOff: false,
  duration: 0,
  localStream: null,
  remoteStream: null,
  timerIntervalId: null,
  callError: null,

  startCall: async (targetUser: User, type: CallType) => {
    try {
      set({
        callState: 'OUTGOING',
        callType: type,
        targetUser,
        duration: 0,
        callError: null,
      });

      sounds.startOutgoingDialTone();

      // Acquire local media
      const stream = await webrtc.getLocalMedia(type);
      set({ localStream: stream });

      // Init ICE servers
      await webrtc.initIceServers();

      // Create WebRTC peer connection
      webrtc.createPeerConnection(targetUser.id, (remoteStream) => {
        set({ remoteStream });
      });

      // Emit call_initiate through socket
      const socket = getSocket();
      socket.emit('call_initiate', { receiverId: targetUser.id, type }, (res: any) => {
        if (res?.error) {
          sounds.stopOutgoingDialTone();
          sounds.playCallEnded();
          webrtc.close();
          set({
            callState: 'IDLE',
            targetUser: null,
            localStream: null,
            callError: res.error,
          });
        }
      });
    } catch (err: any) {
      console.error('Call initiation error:', err);
      sounds.stopOutgoingDialTone();
      webrtc.close();
      set({
        callState: 'IDLE',
        targetUser: null,
        localStream: null,
        callError: err.message || 'Unable to start call.',
      });
    }
  },

  receiveIncomingCall: (caller: User, type: CallType) => {
    sounds.startIncomingRingtone();
    set({
      callState: 'INCOMING',
      callType: type,
      targetUser: caller,
      duration: 0,
      callError: null,
    });
  },

  acceptCall: async () => {
    const { targetUser, callType } = get();
    if (!targetUser) return;

    sounds.stopIncomingRingtone();

    try {
      // Acquire local media
      const stream = await webrtc.getLocalMedia(callType);
      set({ localStream: stream });

      await webrtc.initIceServers();

      webrtc.createPeerConnection(targetUser.id, (remoteStream) => {
        set({ remoteStream });
      });

      // Tell caller we accepted
      const socket = getSocket();
      socket.emit('call_response', {
        callerId: targetUser.id,
        accepted: true,
        type: callType,
      });

      // Start call timer
      const timer = window.setInterval(() => {
        set((state) => ({ duration: state.duration + 1 }));
      }, 1000);

      set({
        callState: 'CONNECTED',
        timerIntervalId: timer,
      });
    } catch (err: any) {
      console.error('Error accepting call:', err);
      get().rejectCall();
    }
  },

  rejectCall: () => {
    sounds.stopIncomingRingtone();
    const { targetUser, callType } = get();
    if (targetUser) {
      const socket = getSocket();
      socket.emit('call_response', {
        callerId: targetUser.id,
        accepted: false,
        type: callType,
      });
    }
    webrtc.close();
    set({
      callState: 'IDLE',
      targetUser: null,
      localStream: null,
      remoteStream: null,
    });
  },

  endCall: (status = 'COMPLETED') => {
    sounds.stopIncomingRingtone();
    sounds.stopOutgoingDialTone();
    sounds.playCallEnded();

    const { targetUser, duration, timerIntervalId, callType } = get();

    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }

    if (targetUser) {
      const socket = getSocket();
      socket.emit('call_end', {
        targetUserId: targetUser.id,
        durationSeconds: duration,
        type: callType,
        status,
      });
    }

    webrtc.close();

    set({
      callState: 'IDLE',
      targetUser: null,
      duration: 0,
      localStream: null,
      remoteStream: null,
      timerIntervalId: null,
      isMuted: false,
      isCameraOff: false,
    });
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    webrtc.toggleAudio(!nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const nextCameraOff = !get().isCameraOff;
    webrtc.toggleVideo(!nextCameraOff);
    set({ isCameraOff: nextCameraOff });
  },

  setRemoteStream: (stream: MediaStream) => {
    set({ remoteStream: stream });
  },
}));
