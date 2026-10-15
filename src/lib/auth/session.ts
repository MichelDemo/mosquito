import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from './jwt'

export type { SessionUser }

/** Utilisateur connecté (Server Components, Route Handlers, Server Actions), ou null. */
export async function getUser(): Promise<SessionUser | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value)
}

export async function startSession(user: SessionUser) {
  cookies().set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export function endSession() {
  cookies().delete(SESSION_COOKIE)
}
