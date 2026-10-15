'use server'

import { redirect } from 'next/navigation'
import { clearFailures, isRateLimited, recordFailure, verifyCredentials } from '@/lib/auth/password'
import { endSession, startSession } from '@/lib/auth/session'

/** Renvoie un message d'erreur, ou redirige vers le tableau de bord en cas de succès. */
export async function loginAction(email: string, motDePasse: string): Promise<{ erreur: string }> {
  if (!email || !motDePasse) {
    return { erreur: 'Veuillez saisir votre adresse e-mail et votre mot de passe.' }
  }
  if (isRateLimited(email)) {
    return { erreur: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.' }
  }

  const user = await verifyCredentials(email, motDePasse)
  if (!user) {
    recordFailure(email)
    return { erreur: 'Adresse e-mail ou mot de passe incorrect.' }
  }

  clearFailures(email)
  await startSession(user)
  redirect('/tableau-de-bord')
}

export async function logoutAction() {
  endSession()
  redirect('/connexion')
}
