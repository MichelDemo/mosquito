import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { formations } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

const deCeFormateur = (id: string, formateurId: string) =>
  and(eq(formations.id, id), eq(formations.formateur_id, formateurId))

// ---------------------------------------------------------------------------
// GET /api/formations/:id
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const formation = isUuid(params.id)
      ? await db.query.formations.findFirst({
          with: {
            participants: true,
            formation_topics: {
              with: {
                topics: {
                  columns: { id: true, titre: true },
                  with: { videos: { columns: { id: true, titre: true, ordre: true } } },
                },
              },
            },
            messages_planifies: {
              with: {
                topics: { columns: { titre: true } },
                videos: { columns: { titre: true } },
              },
            },
          },
          where: deCeFormateur(params.id, user.id),
        })
      : undefined

    if (!formation) {
      return NextResponse.json(
        { error: 'Formation introuvable.' },
        { status: 404 }
      )
    }

    return NextResponse.json(formation)
  } catch (err) {
    console.error('Erreur GET formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT /api/formations/:id
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership
    const [existing] = isUuid(params.id)
      ? await db.select({ id: formations.id }).from(formations).where(deCeFormateur(params.id, user.id)).limit(1)
      : []

    if (!existing) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Only allow updating safe fields
    const allowedFields = ['nom', 'description', 'date_formation', 'statut'] as const
    type AllowedField = (typeof allowedFields)[number]

    const updates: Partial<Record<AllowedField, string | null>> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] ?? null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour.' },
        { status: 400 }
      )
    }

    let updated
    try {
      ;[updated] = await db
        .update(formations)
        // nom/statut à null sont refusés par la base (NOT NULL), comme avant.
        .set(updates as Partial<typeof formations.$inferInsert>)
        .where(eq(formations.id, params.id))
        .returning({ id: formations.id, nom: formations.nom, statut: formations.statut })
    } catch (error) {
      console.error('Erreur update formation:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour.' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Erreur PUT formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/formations/:id
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership before deleting
    const [existing] = isUuid(params.id)
      ? await db.select({ id: formations.id }).from(formations).where(deCeFormateur(params.id, user.id)).limit(1)
      : []

    if (!existing) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    try {
      // Les participants, messages, envois… suivent (ON DELETE CASCADE).
      await db.delete(formations).where(eq(formations.id, params.id))
    } catch (error) {
      console.error('Erreur suppression formation:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Formation supprimée avec succès.' })
  } catch (err) {
    console.error('Erreur DELETE formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
