import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, messages_planifies, videos } from '@/db/schema'
import { signedVideoUrl } from '@/lib/storage'
import { isUuid } from '@/lib/uuid'

// Ne jamais mettre en cache : chaque requête doit régénérer une URL signée fraîche.
// Sans ceci, Next.js met en cache la réponse 302 (Full Route Cache) avec une URL
// signée qui finit par expirer → le stockage renvoie une erreur → "Impossible de charger la vidéo".
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  // Envoi → message → vidéo
  const [row] = isUuid(token)
    ? await db
        .select({ video_id: messages_planifies.video_id, storage_path: videos.storage_path })
        .from(envois_participants)
        .innerJoin(messages_planifies, eq(messages_planifies.id, envois_participants.message_id))
        .leftJoin(videos, eq(videos.id, messages_planifies.video_id))
        .where(eq(envois_participants.token, token))
        .limit(1)
    : []

  if (!row) {
    console.error('video/token: envoi introuvable')
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  if (!row.storage_path) {
    console.error('video/token: pas de fichier vidéo pour video_id', row.video_id)
    return NextResponse.json({ error: 'Pas de fichier vidéo.' }, { status: 404 })
  }

  let signedUrl: string
  try {
    // 7 jours (même durée que la validité du lien email)
    signedUrl = await signedVideoUrl(row.storage_path, 7 * 24 * 3600)
  } catch (err) {
    console.error('video/token: signature échouée', { storage_path: row.storage_path, err })
    return NextResponse.json({ error: 'Impossible de générer le lien vidéo.' }, { status: 500 })
  }

  // Redirection sans cache — URL fraîche à chaque accès
  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
