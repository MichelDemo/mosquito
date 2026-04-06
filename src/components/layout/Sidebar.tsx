'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, LayoutDashboard, BookOpen, GraduationCap, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/connexion/actions'

const navLinks = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/bibliotheque', label: 'Bibliothèque', icon: BookOpen },
  { href: '/formations', label: 'Formations', icon: GraduationCap },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white shadow-sm shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-6 border-b border-gray-100">
        <Brain className="h-7 w-7 text-blue-600" />
        <div>
          <span className="text-lg font-bold text-gray-900">Mosquito</span>
          <p className="text-[10px] text-gray-400 leading-tight">La piqûre de rappel qui ne s'oublie pas.</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  )
}
