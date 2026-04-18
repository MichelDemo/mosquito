import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('auto_evaluations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erreur suppression.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
