'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function supprimerTopic(topicId: string) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', topicId)

  if (error) throw new Error(`Erreur suppression: ${error.message}`)

  revalidatePath('/bibliotheque')
}
