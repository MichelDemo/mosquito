import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { messages_planifies } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

interface UpdateItem {
  id: string
  jours_apres_formation: number
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const updates: UpdateItem[] = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Le champ updates est requis et doit être un tableau non vide.' },
        { status: 400 }
      )
    }

    for (const u of updates) {
      if (!u.id || typeof u.jours_apres_formation !== 'number') {
        return NextResponse.json(
          { error: 'Chaque entrée doit avoir un id et jours_apres_formation numérique.' },
          { status: 400 }
        )
      }
    }

    const messageIds = updates.map((u) => u.id)

    // Verify ownership: all messages must belong to a formation owned by the current user
    let messages
    try {
      messages = messageIds.every(isUuid)
        ? await db.query.messages_planifies.findMany({
            columns: { id: true, formation_id: true },
            with: { formations: { columns: { formateur_id: true } } },
            where: inArray(messages_planifies.id, messageIds),
          })
        : []
    } catch (fetchError) {
      console.error('Erreur vérification messages:', fetchError)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des messages.' },
        { status: 500 }
      )
    }

    if (messages.length !== messageIds.length) {
      return NextResponse.json(
        { error: 'Un ou plusieurs messages sont introuvables.' },
        { status: 404 }
      )
    }

    for (const msg of messages) {
      if (!msg.formations || msg.formations.formateur_id !== user.id) {
        return NextResponse.json(
          { error: 'Accès refusé à un ou plusieurs messages.' },
          { status: 403 }
        )
      }
    }

    // Toutes les mises à jour ou aucune
    let enCours = ''
    try {
      await db.transaction(async (tx) => {
        for (const u of updates) {
          enCours = u.id
          await tx
            .update(messages_planifies)
            .set({ jours_apres_formation: u.jours_apres_formation })
            .where(eq(messages_planifies.id, u.id))
        }
      })
    } catch (updateError) {
      console.error('Erreur mise à jour message:', enCours, updateError)
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour du message ${enCours}.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur inattendue PATCH bulk-update:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
