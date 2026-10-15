import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { videos } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

type RouteParams = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const body = await request.json()
    const { titre, vimeo_id, storage_path, ordre, duree_secondes } = body

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

    let video
    try {
      ;[video] = isUuid(id)
        ? await db
            .update(videos)
            .set({
              titre: titre.trim(),
              vimeo_id: vimeo_id ? String(vimeo_id) : null,
              storage_path: storage_path ?? null,
              ordre: ordreNum,
              duree_secondes: duree_secondes ? parseInt(String(duree_secondes), 10) : null,
            })
            .where(eq(videos.id, id))
            .returning()
        : []
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la vidéo' },
        { status: 500 }
      )
    }

    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: video })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    try {
      if (isUuid(id)) await db.delete(videos).where(eq(videos.id, id))
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la vidéo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Vidéo supprimée avec succès' })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
