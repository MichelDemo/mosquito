import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/session'

export default async function HomePage() {
  const user = await getUser()

  if (user) {
    redirect('/tableau-de-bord')
  } else {
    redirect('/connexion')
  }
}
