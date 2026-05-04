'use client'

import { useState } from 'react'

interface VideoPlayerProps {
  url: string
  titre: string
  poster?: string
}

export default function VideoPlayer({ url, titre, poster }: VideoPlayerProps) {
  const [erreur, setErreur] = useState(false)

  if (erreur) {
    return (
      <div
        className="relative w-full rounded-xl bg-gray-100 flex items-center justify-center text-center px-6 py-10"
        style={{ minHeight: '200px' }}
      >
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">Impossible de charger la vidéo.</p>
          <p className="text-gray-400 text-xs">
            Le fichier est peut-être manquant ou le format n'est pas supporté par votre navigateur.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
      <video
        className="absolute inset-0 w-full h-full rounded-xl bg-black"
        controls
        autoPlay={false}
        disablePictureInPicture
        controlsList="nodownload"
        poster={poster}
        title={titre}
        onContextMenu={(e) => e.preventDefault()}
        onError={() => setErreur(true)}
      >
        <source src={url} />
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  )
}
