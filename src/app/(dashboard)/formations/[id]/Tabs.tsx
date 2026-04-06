'use client'

import { useState, type ReactNode } from 'react'
import { Users, Calendar, BarChart3, ClipboardList } from 'lucide-react'

type IconName = 'Users' | 'Calendar' | 'BarChart3' | 'ClipboardList'

const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  Users,
  Calendar,
  BarChart3,
  ClipboardList,
}

interface Tab {
  id: string
  label: string
  icon: IconName
  content: ReactNode
}

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  const activeTab = tabs.find((t) => t.id === active)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon]
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>{activeTab?.content}</div>
    </div>
  )
}
