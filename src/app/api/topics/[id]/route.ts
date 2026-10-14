import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { topics } from '@/db/schema'
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
    const { titre, description } = body

    if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le titre est obligatoire' },
        { status: 400 }
      )
    }

    if (titre.trim().length > 200) {
      return NextResponse.json(
        { error: 'Le titre ne peut pas dépasser 200 caractères' },
        { status: 400 }
      )
    }

    let topic
    try {
      ;[topic] = isUuid(id)
        ? await db
            .update(topics)
            .set({
              titre: titre.trim(),
              description: description?.trim() || null,
            })
            .where(eq(topics.id, id))
            .returning()
        : []
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du topic' },
        { status: 500 }
      )
    }

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: topic })
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
      // Vidéos et questions du topic suivent (ON DELETE CASCADE).
      if (isUuid(id)) await db.delete(topics).where(eq(topics.id, id))
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du topic' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Topic supprimé avec succès' })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
