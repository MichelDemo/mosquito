import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { auto_eval_criteres } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

// GET — liste tous les critères globaux
export async function GET() {
  try {
    const data = await db
      .select({
        id: auto_eval_criteres.id,
        affirmation: auto_eval_criteres.affirmation,
        categorie: auto_eval_criteres.categorie,
        ordre: auto_eval_criteres.ordre,
        actif: auto_eval_criteres.actif,
      })
      .from(auto_eval_criteres)
      .where(eq(auto_eval_criteres.actif, true))
      .orderBy(asc(auto_eval_criteres.ordre))
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erreur lecture critères:', err)
    return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 })
  }
}

// POST — crée un critère global
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { affirmation, categorie, ordre } = await request.json()
  if (!affirmation?.trim()) return NextResponse.json({ error: 'Affirmation requise.' }, { status: 400 })

  try {
    const [data] = await db
      .insert(auto_eval_criteres)
      .values({ affirmation: affirmation.trim(), categorie: categorie?.trim() || null, ordre: ordre ?? 0 })
      .returning()
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Erreur création critère:', err)
    return NextResponse.json({ error: 'Erreur création.' }, { status: 500 })
  }
}

// PATCH — modifie un critère
export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id, affirmation, categorie, ordre, actif } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const updates: Partial<typeof auto_eval_criteres.$inferInsert> = {}
  if (affirmation !== undefined) updates.affirmation = affirmation.trim()
  if (categorie !== undefined) updates.categorie = categorie?.trim() || null
  if (ordre !== undefined) updates.ordre = ordre
  if (actif !== undefined) updates.actif = actif

  try {
    const [data] =
      isUuid(id) && Object.keys(updates).length > 0
        ? await db.update(auto_eval_criteres).set(updates).where(eq(auto_eval_criteres.id, id)).returning()
        : []
    if (!data) return NextResponse.json({ error: 'Erreur mise à jour.' }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('Erreur mise à jour critère:', err)
    return NextResponse.json({ error: 'Erreur mise à jour.' }, { status: 500 })
  }
}

// DELETE — supprime un critère
export async function DELETE(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  try {
    if (isUuid(id)) await db.delete(auto_eval_criteres).where(eq(auto_eval_criteres.id, id))
  } catch (err) {
    console.error('Erreur suppression critère:', err)
    return NextResponse.json({ error: 'Erreur suppression.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
