import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { messages_planifies } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

interface RouteParams {
  params: { id: string }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership via formation
    const message = isUuid(params.id)
      ? await db.query.messages_planifies.findFirst({
          columns: { id: true, formation_id: true },
          with: { formations: { columns: { formateur_id: true } } },
          where: eq(messages_planifies.id, params.id),
        })
      : undefined

    if (!message) {
      return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
    }

    if (!message.formations || message.formations.formateur_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    try {
      // Les envois associés suivent (ON DELETE CASCADE).
      await db.delete(messages_planifies).where(eq(messages_planifies.id, params.id))
    } catch (error) {
      console.error('Erreur suppression message planifié:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du message.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Message supprimé avec succès.' })
  } catch (err) {
    console.error('Erreur inattendue DELETE message planifié:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
