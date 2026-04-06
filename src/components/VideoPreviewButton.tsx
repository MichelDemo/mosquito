'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

interface VideoPreviewButtonProps {
  url: string
  titre: string
}

export default function VideoPreviewButton({ url, titre }: VideoPreviewButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden bg-gray-900 relative group flex items-center justify-center hover:bg-gray-800 transition-colors"
        title="Prévisualiser la vidéo"
      >
        <Play className="h-6 w-6 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl bg-black rounded-xl overflow-hidden shadow-2xl z-10">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <span className="text-white text-sm font-medium truncate">{titre}</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative" style={{ paddingTop: '56.25%' }}>
              <video
                src={url}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full"
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
