import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { videos } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topic_id')

  if (topicId && !isUuid(topicId)) return NextResponse.json([])

  try {
    const data = await db
      .select({ id: videos.id, titre: videos.titre, ordre: videos.ordre })
      .from(videos)
      .where(topicId ? eq(videos.topic_id, topicId) : undefined)
      .orderBy(asc(videos.ordre))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { topic_id, titre, vimeo_id, storage_path, ordre, duree_secondes } = body

    if (!topic_id) {
      return NextResponse.json({ error: 'Le topic est obligatoire' }, { status: 400 })
    }

    if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
      return NextResponse.json({ error: 'Le titre est obligatoire' }, { status: 400 })
    }

    // Require at least one video source
    if (!storage_path && !vimeo_id) {
      return NextResponse.json(
        { error: 'Un fichier vidéo ou un identifiant Vimeo est obligatoire' },
        { status: 400 }
      )
    }

    // Validate vimeo_id format only when provided
    if (vimeo_id && !/^\d+$/.test(String(vimeo_id))) {
      return NextResponse.json(
        { error: "L'identifiant Vimeo doit être un nombre valide" },
        { status: 400 }
      )
    }

    const ordreNum = parseInt(String(ordre), 10)
    if (isNaN(ordreNum) || ordreNum < 1 || ordreNum > 3) {
      return NextResponse.json(
        { error: "L'ordre doit être compris entre 1 et 3" },
        { status: 400 }
      )
    }

    // Check max 3 videos per topic
    let count: number
    try {
      count = isUuid(topic_id) ? await db.$count(videos, eq(videos.topic_id, topic_id)) : 0
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du nombre de vidéos' },
        { status: 500 }
      )
    }

    if (count >= 3) {
      return NextResponse.json(
        { error: 'Ce topic a déjà atteint le maximum de 3 vidéos' },
        { status: 400 }
      )
    }

    let video
    try {
      ;[video] = await db
        .insert(videos)
        .values({
          topic_id,
          titre: titre.trim(),
          vimeo_id: vimeo_id ? String(vimeo_id) : null,
          storage_path: storage_path ?? null,
          ordre: ordreNum,
          duree_secondes: duree_secondes ? parseInt(String(duree_secondes), 10) : null,
        })
        .returning()
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la vidéo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: video }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
