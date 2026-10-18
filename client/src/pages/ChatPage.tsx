import React, { useEffect } from 'react';
import { Sidebar } from '../components/sidebar/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { Lightbox } from '../components/chat/Lightbox';
import { IncomingCallModal } from '../components/call/IncomingCallModal';
import { ActiveCallModal } from '../components/call/ActiveCallModal';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';
import { getSocket } from '../services/socket';
import { webrtc } from '../services/webrtc';

export const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    activeFriend,
    fetchFriends,
    fetchRequests,
    handleNewMessage,
    handleMessageSent,
    handleUserStatusChange,
    handleInitialOnlineFriends,
    handleUserTyping,
    handleMessagesSeen,
    handleMessageDeleted,
    handleMessageDeletedForMe,
    handleFriendRequestReceived,
    handleFriendRequestAccepted,
  } = useChatStore();

  const {
    receiveIncomingCall,
    endCall,
    setRemoteStream,
    targetUser,
    callType,
  } = useCallStore();

  // Initial load
  useEffect(() => {
    fetchFriends();
    fetchRequests();

    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Setup Socket.IO Event Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // Chat Events
    socket.on('new_message', (msg) => handleNewMessage(msg, user.id));
    socket.on('message_sent', handleMessageSent);
    socket.on('user_status_changed', ({ userId, status }) => handleUserStatusChange(userId, status));
    socket.on('initial_online_friends', ({ onlineFriendIds }) => handleInitialOnlineFriends(onlineFriendIds));
    socket.on('user_typing', ({ senderId, isTyping }) => handleUserTyping(senderId, isTyping));
    socket.on('messages_seen', ({ byUserId }) => handleMessagesSeen(byUserId));
    socket.on('message_deleted', ({ messageId }) => handleMessageDeleted(messageId));
    socket.on('message_deleted_for_me', ({ messageId }) => handleMessageDeletedForMe(messageId));

    // Friend Events
    socket.on('friend_request_received', ({ request }) => handleFriendRequestReceived(request));
    socket.on('friend_request_accepted', ({ friend }) => handleFriendRequestAccepted(friend));
    socket.on('friend_request_cancelled', () => fetchRequests());
    socket.on('unfriended', () => {
      fetchFriends();
    });

    // WebRTC Calling Events
    socket.on('incoming_call', ({ caller, type }) => {
      receiveIncomingCall(caller, type);
    });

    socket.on('call_accepted', async () => {
      // Caller receives acceptance from callee -> initiate WebRTC offer
      try {
        await webrtc.createOffer();
        // Update store state
        useCallStore.setState({
          callState: 'CONNECTED',
          timerIntervalId: window.setInterval(() => {
            useCallStore.setState((s) => ({ duration: s.duration + 1 }));
          }, 1000),
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    socket.on('call_rejected', () => {
      endCall('REJECTED');
    });

    socket.on('call_signal', async ({ signal }) => {
      await webrtc.handleSignal(signal);
    });

    socket.on('call_ended', () => {
      endCall('COMPLETED');
    });

    socket.on('call_busy', () => {
      alert('User is currently on another call.');
      endCall('BUSY');
    });

    socket.on('call_offline', () => {
      alert('User is currently offline.');
      endCall('MISSED');
    });

    return () => {
      socket.off('new_message');
      socket.off('message_sent');
      socket.off('user_status_changed');
      socket.off('initial_online_friends');
      socket.off('user_typing');
      socket.off('messages_seen');
      socket.off('message_deleted');
      socket.off('message_deleted_for_me');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
      socket.off('friend_request_cancelled');
      socket.off('unfriended');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_signal');
      socket.off('call_ended');
      socket.off('call_busy');
      socket.off('call_offline');
    };
  }, [user]);

  return (
    <div
      style={{ height: 'var(--app-height, 100dvh)' }}
      className="h-full w-full max-h-[100dvh] overflow-hidden flex bg-slate-50 dark:bg-slate-950 font-sans"
    >
      {/* Sidebar: Visible on desktop or when no active chat selected on mobile */}
      <div className={`h-full ${activeFriend ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar />
      </div>

      {/* Main Chat Area: Visible on desktop or when active chat selected on mobile */}
      <div className={`h-full flex-1 ${!activeFriend ? 'hidden md:flex' : 'flex'}`}>
        <ChatArea />
      </div>

      {/* Global Modals */}
      <Lightbox />
      <IncomingCallModal />
      <ActiveCallModal />
    </div>
  );
};
