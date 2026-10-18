import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  Loader2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

interface ChatInputProps {
  friendId: string;
  isDisabled?: boolean;
}

const COMMON_EMOJIS = [
  '😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '😎',
  '🙌', '✨', '👏', '🚀', '💯', '🙏', '😊', '🥳',
  '🤔', '😅', '👀', '💡', '☕', '🌟', '🤩', '👋'
];

export const ChatInput: React.FC<ChatInputProps> = ({ friendId, isDisabled = false }) => {
  const { sendMessage, replyingToMessage, setReplyingToMessage, emitTyping } = useChatStore();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto focus input when active friend changes
  useEffect(() => {
    if (!isDisabled) {
      textareaRef.current?.focus();
    }
  }, [friendId, isDisabled]);

  // Handle typing debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Emit typing indicator
    emitTyping(friendId, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitTyping(friendId, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (isSending || isDisabled) return;
    const contentToSend = text.trim();
    if (!contentToSend && !isUploading) return;

    setIsSending(true);
    setText('');
    emitTyping(friendId, false);

    try {
      await sendMessage({
        receiverId: friendId,
        content: contentToSend,
        type: 'TEXT',
      });
    } catch (err: any) {
      console.error('Send message error:', err);
      // Restore text if failed
      setText(contentToSend);
    } finally {
      setIsSending(false);
      // Refocus textarea after sending
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter if composing with IME
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload file handler
  const handleUploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large! Maximum supported size is 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const res = await api.post('/uploads/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(p);
          }
        },
      });

      const { url, fileName, fileSize, type } = res.data;

      await sendMessage({
        receiverId: friendId,
        content: text.trim(),
        type,
        fileUrl: url,
        fileName,
        fileSize,
      });

      setText('');
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clipboard paste listener for images / screenshots
  const handlePaste = (e: React.ClipboardEvent) => {
    if (isDisabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadFile(file);
          break;
        }
      }
    }
  };

  // Insert emoji
  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Reply Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-xs animate-fadeIn">
          <div className="flex items-center space-x-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Replying to {replyingToMessage.sender?.displayName || 'User'}:
            </span>
            <span className="text-slate-600 dark:text-slate-300 truncate">
              {replyingToMessage.content || (replyingToMessage.type === 'IMAGE' ? 'Photo' : 'Document')}
            </span>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="mb-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 flex items-center space-x-3 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span className="text-indigo-700 dark:text-indigo-300 font-medium">
            Uploading attachment ({uploadProgress}%)...
          </span>
          <div className="flex-1 h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-4 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-30 animate-fadeIn w-64">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Emojis
            </span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1 text-xl">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadFile(f);
          }}
          disabled={isDisabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled || isUploading}
          className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach image or file (Max 10MB)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isDisabled}
          className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Field */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={isDisabled}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isDisabled
                ? 'Only accepted friends can chat or send files.'
                : 'Type a message... (Press Enter to send)'
            }
            className="w-full px-4 py-2.5 max-h-32 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || (!text.trim() && !isUploading)}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
