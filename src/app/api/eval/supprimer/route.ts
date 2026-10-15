import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { auto_evaluations } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

export async function DELETE(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  try {
    if (isUuid(id)) await db.delete(auto_evaluations).where(eq(auto_evaluations.id, id))
  } catch (err) {
    console.error('Erreur suppression auto-évaluation:', err)
    return NextResponse.json({ error: 'Erreur suppression.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
