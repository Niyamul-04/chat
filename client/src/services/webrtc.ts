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

  private candidateQueue: RTCIceCandidateInit[] = [];

  createPeerConnection(targetUserId: string, onRemoteStream: (stream: MediaStream) => void): RTCPeerConnection {
    this.targetUserId = targetUserId;
    this.onRemoteStreamCallback = onRemoteStream;
    this.candidateQueue = [];

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServersCache,
    });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.enabled = true; // explicitly ensure enabled
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote stream tracks
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        stream = this.remoteStream;
      } else {
        this.remoteStream = stream;
      }

      // Explicitly ensure incoming audio tracks are unmuted and active
      if (event.track) {
        event.track.enabled = true;
      }

      if (this.remoteStream && this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
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

  async createOffer(callType: 'AUDIO' | 'VIDEO' = 'AUDIO'): Promise<void> {
    if (!this.peerConnection || !this.targetUserId) return;

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'VIDEO',
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

      // Process any buffered ICE candidates once remoteDescription is set
      while (this.candidateQueue.length > 0) {
        const candidate = this.candidateQueue.shift();
        if (candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (candErr) {
            console.warn('Error applying buffered ICE candidate:', candErr);
          }
        }
      }

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
      if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      } else {
        // Buffer candidate until remote description is set
        this.candidateQueue.push(signal.candidate);
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
    this.candidateQueue = [];
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
