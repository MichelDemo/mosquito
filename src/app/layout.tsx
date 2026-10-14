import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

// Toutes les pages lisent la base à chaque requête. Avec Postgres (pg), Next ne « voit »
// pas ces accès comme il voyait les fetch Supabase : sans ceci, une page sans cookies
// (ex. /v/[token]) serait rendue une fois puis servie figée depuis le cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mosquito — La piqûre de rappel qui ne s\'oublie pas.',
  description: 'Mosquito. La piqûre de rappel qui ne s\'oublie pas.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
