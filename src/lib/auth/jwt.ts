import { jwtVerify, SignJWT } from 'jose'

// Session sans état : un JWT signé (HS256) dans un cookie httpOnly. Ce module n'utilise
// que des API Web (jose) pour pouvoir tourner dans le middleware (runtime Edge).

export const SESSION_COOKIE = 'mosquito_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 jours

export type SessionUser = { id: string; email: string }

function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET manquant ou trop court (32 caractères minimum)')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey())
}

/** Renvoie l'utilisateur si le jeton est valide et non expiré, sinon null. */
export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    if (!payload.sub || typeof payload.email !== 'string') return null
    return { id: payload.sub, email: payload.email }
  } catch {
    return null
  }
}
