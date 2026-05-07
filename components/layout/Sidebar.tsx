'use client'

import { useUIStore, getNavigationItems } from '@/lib/store'
import { cn } from '@/lib/utils'
import { 
  Bot, 
  User,
  Award,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { useState } from 'react'
import { LoginRequiredModal } from '@/components/ui/LoginRequiredModal'

const iconMap = {
  Bot,
  User,
  Award,
}

export function Sidebar() {
  const { role, sidebarOpen, setSidebarOpen, theme } = useUIStore()
  const pathname = usePathname()
  const { authenticated } = useWaaP()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const isLight = theme === 'light'

  const navigationItems = getNavigationItems(role)

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Block access to app pages if not authenticated
    if (!authenticated) {
      e.preventDefault()
      setShowLoginModal(true)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className={cn(
            "fixed inset-0 backdrop-blur-sm z-40",
            isLight ? "bg-slate-900/20" : "bg-black/50"
          )}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 transition-transform duration-300",
          isLight
            ? "bg-white/95 border-r border-slate-300 shadow-xl"
            : "glass-sidebar border-r border-white/10",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-screen flex-col">
          {/* Header */}
          <div className={cn("flex items-center justify-between p-6 border-b", isLight ? "border-slate-200" : "border-white/10")}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.svg"
                  alt="MotusDAO Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg gradient-text">
                  MotusDAO
                </h1>
                <p className={cn("text-xs", isLight ? "text-slate-500" : "text-muted-foreground")}>MotusAI Chat</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isLight ? "text-slate-700 hover:bg-slate-100" : "hover:bg-white/15"
              )}
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap]
              const isActive = pathname === item.href
              const isBlocked = !authenticated

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? isLight
                        ? "bg-mauve-100 text-mauve-800 border border-mauve-300"
                        : "bg-mauve-500/20 text-mauve-400 border border-mauve-500/30"
                      : isLight
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    isBlocked && "opacity-60 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    handleLinkClick(e, item.href)
                    setSidebarOpen(false)
                  }}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? (isLight ? "text-mauve-700" : "text-mauve-400")
                        : "group-hover:text-foreground"
                    )} 
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className={cn("p-4 border-t", isLight ? "border-slate-200" : "border-white/10")}>
            <div className={cn("text-xs text-center", isLight ? "text-slate-500" : "text-muted-foreground")}>
              <p>MotusDAO Hub v1.0</p>
              <p className="mt-1">Mental Health & Wellness</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  )
}
