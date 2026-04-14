import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// GET — liste tous les critères globaux
export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('auto_eval_criteres')
    .select('id, affirmation, categorie, ordre, actif')
    .eq('actif', true)
    .order('ordre')

  if (error) return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crée un critère global
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { affirmation, categorie, ordre } = await request.json()
  if (!affirmation?.trim()) return NextResponse.json({ error: 'Affirmation requise.' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('auto_eval_criteres')
    .insert({ affirmation: affirmation.trim(), categorie: categorie?.trim() || null, ordre: ordre ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur création.' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — modifie un critère
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id, affirmation, categorie, ordre, actif } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const updates: Record<string, unknown> = {}
  if (affirmation !== undefined) updates.affirmation = affirmation.trim()
  if (categorie !== undefined) updates.categorie = categorie?.trim() || null
  if (ordre !== undefined) updates.ordre = ordre
  if (actif !== undefined) updates.actif = actif

  const { data, error } = await admin
    .from('auto_eval_criteres')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur mise à jour.' }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — supprime un critère
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('auto_eval_criteres').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erreur suppression.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
