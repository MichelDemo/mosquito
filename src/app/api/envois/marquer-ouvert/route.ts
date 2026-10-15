import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

export async function POST(request: NextRequest) {
  try {
    const body: { token: string } = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant.' },
        { status: 400 }
      )
    }

    const [envoi] = isUuid(token)
      ? await db
          .select({ id: envois_participants.id })
          .from(envois_participants)
          .where(eq(envois_participants.token, token))
          .limit(1)
      : []

    if (!envoi) {
      return NextResponse.json(
        { error: 'Token invalide.' },
        { status: 404 }
      )
    }

    // Mettre à jour uniquement si pas encore ouvert
    await db
      .update(envois_participants)
      .set({ ouvert_le: new Date().toISOString() })
      .where(and(eq(envois_participants.id, envoi.id), isNull(envois_participants.ouvert_le)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur marquer-ouvert:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}
