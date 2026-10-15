import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'

/**
 * Routes publiques ne nécessitant pas d'authentification.
 * /connexion  : page de connexion
 * /v/*        : pages de visualisation de vidéo + quiz (accès par token)
 */
const ROUTES_PUBLIQUES = ['/connexion', '/api/desabonner', '/api/reporter']
const PREFIXES_PUBLICS = ['/v/', '/desabonner/', '/preferences/', '/eval/', '/api/video/', '/api/eval/', '/api/cron/', '/api/quiz/']

function estRoutePublique(pathname: string): boolean {
  if (ROUTES_PUBLIQUES.includes(pathname)) return true
  return PREFIXES_PUBLICS.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  // Routes publiques : on laisse passer sans vérification
  if (estRoutePublique(pathname)) {
    if (pathname === '/connexion' && user) {
      return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
    }
    return NextResponse.next()
  }

  // Routes protégées : rediriger vers /connexion si non authentifié
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('redirection', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)',
  ],
}
