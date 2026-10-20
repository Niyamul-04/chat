import React, { useState } from 'react';
import { Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getMediaUrl } from '../../services/api';
import {
  Check,
  CheckCheck,
  Reply,
  Trash2,
  MoreHorizontal,
  FileText,
  Download,
  CornerDownRight,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuthStore();
  const { setReplyingToMessage, deleteMessage, setLightboxMedia } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);

  const isMe = message.senderId === user?.id;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`group flex items-end space-x-2 my-1 relative ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Action Trigger for Sender/Receiver (Hover or Active) */}
      <div
        className={`opacity-0 group-hover:opacity-100 sm:opacity-0 focus-within:opacity-100 transition-opacity flex items-center space-x-1 ${
          isMe ? 'order-first' : 'order-last'
        }`}
      >
        <button
          onClick={() => setReplyingToMessage(message)}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Options & Delete"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div
              className={`absolute top-full mt-1 w-40 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-30 text-xs animate-fadeIn ${
                isMe ? 'right-0' : 'left-0'
              }`}
            >
              <button
                onClick={() => {
                  deleteMessage(message.id, 'for_me');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Delete for me</span>
              </button>
              {isMe && !message.isDeleted && (
                <button
                  onClick={() => {
                    deleteMessage(message.id, 'for_everyone');
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete for everyone</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bubble Container */}
      <div
        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs relative text-[13.5px] select-text transition-all ${
          isMe
            ? 'bg-indigo-600 dark:bg-indigo-600 text-white rounded-tr-xs shadow-indigo-600/10'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/60 rounded-tl-xs shadow-black/5'
        }`}
      >
        {/* Reply Quote Preview */}
        {message.replyTo && (
          <div
            className={`mb-2 p-2 rounded-xl text-xs flex items-start space-x-2 border-l-2 ${
              isMe
                ? 'bg-indigo-700/60 border-white/80 text-indigo-100'
                : 'bg-slate-100 dark:bg-slate-900/60 border-indigo-500 text-slate-600 dark:text-slate-300'
            }`}
          >
            <CornerDownRight className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-70" />
            <div className="truncate">
              <span className="font-semibold block">
                {message.replyTo.sender?.displayName || 'User'}
              </span>
              <span className="opacity-80">
                {message.replyTo.content || (message.replyTo.type === 'IMAGE' ? 'Photo' : 'File')}
              </span>
            </div>
          </div>
        )}

        {/* Deleted Message */}
        {message.isDeleted ? (
          <p className="italic text-xs opacity-75">This message was deleted</p>
        ) : (
          <>
            {/* Image Attachment */}
            {message.type === 'IMAGE' && message.fileUrl && (
              <div className="mb-1.5 overflow-hidden rounded-xl cursor-pointer relative group/img">
                <img
                  src={getMediaUrl(message.fileUrl)}
                  alt={message.fileName || 'Photo'}
                  onClick={() =>
                    setLightboxMedia({
                      url: message.fileUrl!,
                      fileName: message.fileName || undefined,
                      messageId: message.id,
                      isMe,
                    })
                  }
                  className="max-h-72 w-full object-cover rounded-xl hover:opacity-95 transition"
                />
                {/* Direct quick delete icon for images */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessage(message.id, isMe ? 'for_everyone' : 'for_me');
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white opacity-0 group-hover/img:opacity-100 transition shadow-lg backdrop-blur-xs"
                  title={isMe ? 'Delete for everyone' : 'Delete for me'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Document/File Attachment */}
            {message.type === 'FILE' && message.fileUrl && (
              <a
                href={getMediaUrl(message.fileUrl)}
                download={message.fileName || 'file'}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center space-x-3 p-2.5 rounded-xl mb-1.5 transition ${
                  isMe
                    ? 'bg-indigo-700/50 hover:bg-indigo-700/70 text-white'
                    : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs truncate">{message.fileName || 'Document'}</p>
                  <p className="text-[10px] opacity-75">{formatFileSize(message.fileSize)}</p>
                </div>
                <Download className="w-4 h-4 opacity-75 hover:opacity-100 flex-shrink-0" />
              </a>
            )}

            {/* Message Text Content */}
            {message.content && (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            )}
          </>
        )}

        {/* Message Meta: Time & WhatsApp-Style Checkmarks */}
        <div
          className={`flex items-center justify-end space-x-1 mt-0.5 ml-2 select-none float-right clear-both text-[10.5px] ${
            isMe ? 'text-indigo-200/90' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isMe && !message.isDeleted && (
            <span className="flex-shrink-0 ml-0.5">
              {message.status === 'SENT' && <Check className="w-3.5 h-3.5 text-indigo-200" />}
              {message.status === 'DELIVERED' && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
              {message.status === 'SEEN' && (
                <CheckCheck className="w-3.5 h-3.5 text-sky-300 font-bold" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
