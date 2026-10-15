import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { messages_planifies } from '@/db/schema'
import { formationsDuFormateur } from '@/db/ownership'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const data = isUuid(params.id)
    ? await db.query.messages_planifies.findFirst({
        columns: {
          id: true,
          formation_id: true,
          topic_id: true,
          video_id: true,
          type_planification: true,
          date_envoi: true,
          jours_apres_formation: true,
          statut: true,
        },
        with: {
          topics: { columns: { titre: true } },
          videos: { columns: { id: true, titre: true } },
        },
        where: and(
          eq(messages_planifies.id, params.id),
          inArray(messages_planifies.formation_id, formationsDuFormateur(user.id))
        ),
      })
    : undefined

  if (!data) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await request.json()
  const { type_planification, date_envoi, jours_apres_formation, video_id } = body

  let updated: { id: string }[] = []
  try {
    if (isUuid(params.id)) {
      updated = await db
        .update(messages_planifies)
        .set({ type_planification, date_envoi, jours_apres_formation, video_id })
        .where(
          and(
            eq(messages_planifies.id, params.id),
            inArray(messages_planifies.formation_id, formationsDuFormateur(user.id))
          )
        )
        .returning({ id: messages_planifies.id })
    }
  } catch (err) {
    console.error('Erreur mise à jour message:', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  }

  // Message inexistant ou d'un autre formateur : rien n'a été modifié.
  if (updated.length === 0) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })

  return NextResponse.json({ success: true })
}
