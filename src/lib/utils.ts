import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function generateToken(): string {
  return crypto.randomUUID()
}

export function statutBadgeClass(statut: string): string {
  switch (statut) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'terminee':
      return 'bg-blue-100 text-blue-800'
    case 'brouillon':
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
