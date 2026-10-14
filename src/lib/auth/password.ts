import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import type { SessionUser } from './jwt'

// Hash factice : on compare quand même quand l'e-mail est inconnu, pour que le temps de
// réponse ne révèle pas quels comptes existent.
const DUMMY_HASH = bcrypt.hashSync('compte-inexistant', 12)

/** Vérifie e-mail + mot de passe ; renvoie l'utilisateur ou null. */
export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const [user] = await db
    .select({ id: users.id, email: users.email, password_hash: users.password_hash })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)

  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH)
  return ok && user?.password_hash ? { id: user.id, email: user.email } : null
}

// Limitation des tentatives (Supabase Auth le faisait pour nous) : 5 échecs par e-mail
// sur 15 minutes. En mémoire : suffisant pour une seule instance.
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const failures = new Map<string, number[]>()

export function isRateLimited(email: string): boolean {
  const key = email.trim().toLowerCase()
  const recent = (failures.get(key) ?? []).filter((t) => Date.now() - t < WINDOW_MS)
  failures.set(key, recent)
  return recent.length >= MAX_FAILURES
}

export function recordFailure(email: string) {
  const key = email.trim().toLowerCase()
  failures.set(key, [...(failures.get(key) ?? []), Date.now()])
}

export function clearFailures(email: string) {
  failures.delete(email.trim().toLowerCase())
}
