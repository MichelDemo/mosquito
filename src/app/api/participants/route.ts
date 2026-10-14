import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, formations, messages_planifies, participants } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formation_id, prenom, nom, email, telephone, canal_email, canal_whatsapp } = body

    // Validation
    if (!formation_id) {
      return NextResponse.json(
        { error: "L'identifiant de la formation est requis." },
        { status: 400 }
      )
    }

    if (!prenom?.trim()) {
      return NextResponse.json(
        { error: 'Le prénom est requis.' },
        { status: 400 }
      )
    }

    if (!nom?.trim()) {
      return NextResponse.json(
        { error: 'Le nom est requis.' },
        { status: 400 }
      )
    }

    if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      )
    }

    // Verify the formation belongs to the current user
    const [formation] = isUuid(formation_id)
      ? await db
          .select({ id: formations.id, statut: formations.statut })
          .from(formations)
          .where(and(eq(formations.id, formation_id), eq(formations.formateur_id, user.id)))
          .limit(1)
      : []

    if (!formation) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    // Check for duplicate email in this formation
    const [existing] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.formation_id, formation_id), eq(participants.email, email.trim().toLowerCase())))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: 'Un participant avec cette adresse email existe déjà dans cette formation.' },
        { status: 409 }
      )
    }

    let participant
    try {
      participant = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(participants)
          .values({
            formation_id,
            prenom: prenom.trim(),
            nom: nom.trim(),
            email: email.trim().toLowerCase(),
            telephone: telephone?.trim() || null,
            canal_email: canal_email !== false,
            canal_whatsapp: canal_whatsapp === true,
          })
          .returning()

        // Si la formation est active, créer les envois_participants pour ce nouveau participant
        if (formation.statut === 'active') {
          const messages = await tx
            .select({ id: messages_planifies.id })
            .from(messages_planifies)
            .where(eq(messages_planifies.formation_id, formation_id))

          if (messages.length > 0) {
            await tx.insert(envois_participants).values(
              messages.map((msg) => ({
                participant_id: created.id,
                message_id: msg.id,
                token: crypto.randomUUID(),
                statut: 'en_attente' as const,
              }))
            )
          }
        }
        return created
      })
    } catch (error) {
      console.error('Erreur ajout participant:', error)
      return NextResponse.json(
        { error: "Erreur lors de l'ajout du participant." },
        { status: 500 }
      )
    }

    return NextResponse.json(participant, { status: 201 })
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
