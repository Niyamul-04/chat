import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { X, Download, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

export const Lightbox: React.FC = () => {
  const { lightboxMedia, setLightboxMedia, deleteMessage } = useChatStore();
  const [zoom, setZoom] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxMedia(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLightboxMedia]);

  if (!lightboxMedia) return null;

  const fullUrl = getMediaUrl(lightboxMedia.url);

  const handleDelete = (mode: 'for_me' | 'for_everyone') => {
    if (lightboxMedia.messageId) {
      deleteMessage(lightboxMedia.messageId, mode);
    }
    setLightboxMedia(null);
  };

  return (
    <div
      onClick={() => setLightboxMedia(null)}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn select-none"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center space-x-2 sm:space-x-3 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10"
      >
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <a
          href={fullUrl}
          download={lightboxMedia.fileName || 'image.jpg'}
          target="_blank"
          rel="noreferrer"
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>

        {lightboxMedia.messageId && (
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition"
              title="Delete Image"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-xs space-y-1 z-30">
                <p className="px-2 py-1 text-slate-400 font-medium">Delete this image?</p>
                <button
                  onClick={() => handleDelete('for_me')}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition flex items-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete for me</span>
                </button>
                {lightboxMedia.isMe && (
                  <button
                    onClick={() => handleDelete('for_everyone')}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition flex items-center space-x-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete for everyone</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setLightboxMedia(null)}
          className="p-2 text-white/80 hover:text-white hover:bg-rose-500/30 rounded-xl transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] overflow-hidden flex items-center justify-center transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
      >
        <img
          src={fullUrl}
          alt={lightboxMedia.fileName || 'Fullscreen Image'}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};
