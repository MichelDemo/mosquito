'use client'

interface VideoPlayerProps {
  url: string
  titre: string
  poster?: string
}

export default function VideoPlayer({ url, titre, poster }: VideoPlayerProps) {
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
      >
        <source src={url} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  )
}
