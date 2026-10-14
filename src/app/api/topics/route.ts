import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { topicsAvecNombreDeVideos } from '@/db/queries'
import { getUser } from '@/lib/auth/session'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ data: await topicsAvecNombreDeVideos() })
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des topics' },
      { status: 500 }
    )
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
      ;[topic] = await db
        .insert(topics)
        .values({
          titre: titre.trim(),
          description: description?.trim() || null,
        })
        .returning()
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la création du topic' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: topic }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
