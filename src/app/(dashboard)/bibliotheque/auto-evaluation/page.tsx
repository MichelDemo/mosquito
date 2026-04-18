export const dynamic = 'force-dynamic'

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import CriteresManager from './CriteresManager'

export default async function AutoEvaluationPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const admin = createAdminSupabaseClient()
  const { data: criteres } = await admin
    .from('auto_eval_criteres')
    .select('id, affirmation, categorie, ordre, actif')
    .eq('actif', true)
    .order('ordre')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ClipboardList className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Critères d'auto-évaluation</h1>
            <p className="text-sm text-gray-500">Ces critères s'appliquent à toutes vos formations</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <CriteresManager criteres={criteres ?? []} />
        </div>
      </div>
    </div>
  )
}
