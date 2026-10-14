import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { participants } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

interface RouteParams {
  params: { id: string }
}

/** Participant avec le formateur de sa formation, pour le contrôle d'accès. */
function chargerParticipant(id: string) {
  if (!isUuid(id)) return Promise.resolve(undefined)
  return db.query.participants.findFirst({
    columns: { id: true, formation_id: true },
    with: { formations: { columns: { formateur_id: true } } },
    where: eq(participants.id, id),
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
    }

    const body = await request.json()
    const { prenom, nom, email, telephone, canal_email, canal_whatsapp } = body

    if (!prenom?.trim() || !nom?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Prénom, nom et email sont requis.' }, { status: 400 })
    }
    if (!canal_email && !canal_whatsapp) {
      return NextResponse.json({ error: 'Au moins un canal de communication est requis.' }, { status: 400 })
    }
    if (canal_whatsapp && !telephone?.trim()) {
      return NextResponse.json({ error: 'Numéro de téléphone requis pour WhatsApp.' }, { status: 400 })
    }

    const participant = await chargerParticipant(params.id)

    if (!participant) {
      return NextResponse.json({ error: 'Participant introuvable.' }, { status: 404 })
    }
    if (!participant.formations || participant.formations.formateur_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    let updated
    try {
      ;[updated] = await db
        .update(participants)
        .set({
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
          telephone: telephone?.trim() || null,
          canal_email: canal_email === true,
          canal_whatsapp: canal_whatsapp === true,
        })
        .where(eq(participants.id, params.id))
        .returning()
    } catch (error) {
      console.error('Erreur modification participant:', error)
      return NextResponse.json({ error: 'Erreur lors de la modification.' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
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

    // Verify the participant belongs to a formation owned by the current user
    const participant = await chargerParticipant(params.id)

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant introuvable.' },
        { status: 404 }
      )
    }

    if (!participant.formations || participant.formations.formateur_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé.' },
        { status: 403 }
      )
    }

    try {
      // Ses envois, réponses et auto-évaluations suivent (ON DELETE CASCADE).
      await db.delete(participants).where(eq(participants.id, params.id))
    } catch (error) {
      console.error('Erreur suppression participant:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du participant.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Participant supprimé avec succès.' })
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
