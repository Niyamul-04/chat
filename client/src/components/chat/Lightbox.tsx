import React from 'react';
import { useChatStore } from '../../store/chatStore';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

export const Lightbox: React.FC = () => {
  const { lightboxMedia, setLightboxMedia } = useChatStore();
  const [zoom, setZoom] = React.useState(1);

  if (!lightboxMedia) return null;

  const fullUrl = getMediaUrl(lightboxMedia.url);

  return (
    <div
      onClick={() => setLightboxMedia(null)}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn select-none"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center space-x-3 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10"
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
