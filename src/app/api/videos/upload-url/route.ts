import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/session'
import { signedUploadUrl } from '@/lib/storage'
import { isUuid } from '@/lib/uuid'

const TAILLE_MAX = 500 * 1024 * 1024 // 500 Mo

// POST — URL d'envoi signée : le navigateur envoie la vidéo directement dans le bucket
// (pas de transit par le serveur). Chemin, type et taille sont fixés par la signature.
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour effectuer cette action' }, { status: 401 })
  }

  const { topic_id, video_id, filename, content_type, size } = await request.json()

  if (!isUuid(topic_id) || !isUuid(video_id)) {
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 400 })
  }
  if (typeof content_type !== 'string' || !content_type.startsWith('video/')) {
    return NextResponse.json({ error: 'Le fichier doit être une vidéo' }, { status: 400 })
  }
  if (typeof size !== 'number' || size <= 0 || size > TAILLE_MAX) {
    return NextResponse.json({ error: 'La vidéo ne doit pas dépasser 500 Mo' }, { status: 400 })
  }

  const ext = String(filename ?? '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4'
  const storagePath = `${topic_id}/${video_id}-${Date.now()}.${ext}`

  const uploadUrl = await signedUploadUrl(storagePath, content_type, size)
  return NextResponse.json({ upload_url: uploadUrl, storage_path: storagePath })
}
