import { api } from './api';
import { getSocket } from './socket';

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetUserId: string | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private iceServersCache: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  async initIceServers(): Promise<RTCIceServer[]> {
    try {
      const res = await api.get('/calls/config');
      if (res.data?.iceServers && Array.isArray(res.data.iceServers)) {
        this.iceServersCache = res.data.iceServers;
      }
    } catch (e) {
      console.warn('Using default STUN servers:', e);
    }
    return this.iceServersCache;
  }

  async getLocalMedia(type: 'AUDIO' | 'VIDEO'): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'VIDEO' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err: any) {
      console.error('Error getting media devices:', err);
      // Fallback: if video was requested and failed (e.g. no camera attached), try audio-only
      if (type === 'VIDEO') {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return this.localStream;
        } catch (audioErr) {
          throw new Error('Could not access microphone or camera. Please check browser permissions.');
        }
      }
      throw new Error('Could not access microphone. Please check browser permissions.');
    }
  }

  createPeerConnection(targetUserId: string, onRemoteStream: (stream: MediaStream) => void): RTCPeerConnection {
    this.targetUserId = targetUserId;
    this.onRemoteStreamCallback = onRemoteStream;

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServersCache,
    });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote stream tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
    };

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        const socket = getSocket();
        socket.emit('call_signal', {
          targetUserId: this.targetUserId,
          signal: { candidate: event.candidate },
        });
      }
    };

    this.peerConnection = pc;
    return pc;
  }

  async createOffer(): Promise<void> {
    if (!this.peerConnection || !this.targetUserId) return;

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);

    const socket = getSocket();
    socket.emit('call_signal', {
      targetUserId: this.targetUserId,
      signal: { sdp: this.peerConnection.localDescription },
    });
  }

  async handleSignal(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    if (signal.sdp) {
      const desc = new RTCSessionDescription(signal.sdp);
      await this.peerConnection.setRemoteDescription(desc);

      if (desc.type === 'offer') {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const socket = getSocket();
        if (this.targetUserId) {
          socket.emit('call_signal', {
            targetUserId: this.targetUserId,
            signal: { sdp: this.peerConnection.localDescription },
          });
        }
      }
    } else if (signal.candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  close() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.targetUserId = null;
    this.onRemoteStreamCallback = null;
  }
}

export const webrtc = new WebRTCManager();
