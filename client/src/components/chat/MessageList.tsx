import React, { useRef, useEffect } from 'react';
import { Message, User } from '../../types';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '../../store/chatStore';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  friend: User;
  messages: Message[];
  hasMore: boolean;
  onLoadMore: () => void;
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  friend,
  messages,
  hasMore,
  onLoadMore,
  isTyping,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll on new message received
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [friend.id]);

  // Scroll to bottom when viewport resizes (e.g. virtual keyboard opens)
  useEffect(() => {
    const handleViewportResize = () => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Handle scroll to top to load more
  const handleScroll = () => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && hasMore) {
      onLoadMore();
    }
  };

  // Group messages by date
  const renderMessagesWithDateSeparators = () => {
    let lastDate = '';

    return messages.map((msg) => {
      const msgDate = new Date(msg.createdAt).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const showDateSeparator = msgDate !== lastDate;
      lastDate = msgDate;

      return (
        <React.Fragment key={msg.id}>
          {showDateSeparator && (
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none shadow-xs">
                {msgDate}
              </span>
            </div>
          )}
          <MessageBubble message={msg} />
        </React.Fragment>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-1 select-none"
    >
      {/* Load More Spinner */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        </div>
      )}

      {/* No messages notice */}
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 mb-4 shadow-inner">
            👋
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200">
            Start a conversation with {friend.displayName}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Send a message, photo, or document to start chatting!
          </p>
        </div>
      ) : (
        renderMessagesWithDateSeparators()
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-center space-x-2 my-2 animate-fadeIn">
          <div className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 shadow-xs">
            <span>{friend.displayName} is typing</span>
            <span className="flex space-x-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
