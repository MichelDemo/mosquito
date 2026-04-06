'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email')
  const motDePasse = formData.get('mot_de_passe')

  if (typeof email !== 'string' || typeof motDePasse !== 'string') {
    redirect('/connexion?erreur=champs_manquants')
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: motDePasse,
  })

  if (error) {
    const code =
      error.message === 'Invalid login credentials'
        ? 'identifiants_invalides'
        : error.message === 'Email not confirmed'
        ? 'email_non_confirme'
        : 'erreur_inconnue'

    redirect(`/connexion?erreur=${code}`)
  }

  redirect('/tableau-de-bord')
}

export async function logoutAction() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/connexion')
}
