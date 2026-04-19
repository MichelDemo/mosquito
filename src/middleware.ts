import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes publiques ne nécessitant pas d'authentification.
 * /connexion  : page de connexion
 * /v/*        : pages de visualisation de vidéo + quiz (accès par token)
 */
const ROUTES_PUBLIQUES = ['/connexion']
const PREFIXES_PUBLICS = ['/v/', '/desabonner/', '/eval/', '/api/video/', '/api/eval/', '/api/cron/']

function estRoutePublique(pathname: string): boolean {
  if (ROUTES_PUBLIQUES.includes(pathname)) return true
  return PREFIXES_PUBLICS.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Passer `request` directement pour que les cookies mis à jour
  // soient correctement propagés aux Server Components
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Rafraîchit la session si elle est expirée — important à appeler dans le middleware
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Routes publiques : on laisse passer sans vérification
  if (estRoutePublique(pathname)) {
    if (pathname === '/connexion' && user) {
      return NextResponse.redirect(new URL('/tableau-de-bord', request.url))
    }
    return supabaseResponse
  }

  // Routes protégées : rediriger vers /connexion si non authentifié
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('redirection', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)',
  ],
}
