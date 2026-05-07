'use client'

import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Menu, 
  Sun, 
  Moon, 
  User, 
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  Check,
  Zap,
  Shield
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { identifyEmbeddedWallet } from '@/lib/wallet-utils'
import { LiquidGlass, LiquidGlassFilter } from '@/components/ui/liquid-glass'

export function Topbar() {
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    theme, 
    setTheme
  } = useUIStore()
  
  // WaaP authentication hooks (replaces Privy)
  const { ready, authenticated, user, login, logout } = useWaaP()
  const { wallets } = useWaaPWallets()
  
  // ZeroDev smart wallet hook
  const { smartAccountAddress, isInitializing } = useSmartAccount()
  
  // Get EOA (embedded wallet from WaaP)
  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const eoaAddress = embeddedWallet?.address
  
  // Get email from user
  const userEmail = user?.email?.address || user?.google?.email || 'No disponible'
  
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const userSyncRef = useRef<string | null>(null)
  const isLight = theme === 'light'

  // Sync WAAP identity into app DB for chat/profile use.
  useEffect(() => {
    const syncUser = async () => {
      if (!ready || !authenticated || !user) return

      const userEmail = user?.email?.address || user?.google?.email
      const waapId = user?.id
      const activeAddress = smartAccountAddress || eoaAddress

      if (!userEmail || !activeAddress) return

      const syncKey = `${userEmail}:${activeAddress}`
      if (userSyncRef.current === syncKey) return

      try {
        const response = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            eoaAddress: eoaAddress || activeAddress,
            smartWalletAddress: smartAccountAddress || undefined,
            waapId,
          }),
        })

        if (!response.ok) return
        userSyncRef.current = syncKey
      } catch (err) {
        console.error('Error syncing user record:', err)
      }
    }

    void syncUser()
  }, [ready, authenticated, user, eoaAddress, smartAccountAddress])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'matrix') => {
    setTheme(newTheme)
    setShowThemeDropdown(false)
  }

  const handleLogin = () => {
    void login()
  }

  const handleLogout = async () => {
    await logout()
    setShowUserDropdown(false)
  }

  const handleCopyAddress = async (address: string, type: string) => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setCopiedAddress(type)
        setTimeout(() => setCopiedAddress(null), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header className="fixed top-4 left-0 right-0 z-40 mx-2 sm:mx-4 max-w-full">
      <LiquidGlassFilter />
      <LiquidGlass
        variant={isLight ? "light" : "dark"}
        className={cn(
          "relative z-40 overflow-visible border",
          isLight ? "border-slate-200/90" : "border-white/10"
        )}
        contentClassName="flex h-12 sm:h-16 items-center justify-between px-3 sm:px-6"
      >
        {/* Left side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isLight ? "text-slate-800 hover:bg-slate-200/80" : "hover:bg-white/10"
            )}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className={cn(
              "hidden rounded-2xl border px-4 py-2 text-xs sm:block",
              isLight
                ? "border-slate-300 bg-white text-slate-600"
                : "border-white/15 bg-white/10 text-muted-foreground"
            )}
          >
            MotusAI Chat
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle Dropdown */}
          <div className="relative">
          <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className={cn(
              "p-2 rounded-xl transition-colors focus-ring",
              theme === 'light'
                ? "text-slate-700 hover:bg-black/10"
                : "text-white/90 hover:bg-white/15"
            )}
              aria-label="Theme selector"
          >
            {theme === 'light' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
            ) : theme === 'dark' ? (
                <Moon className="w-5 h-5 text-blue-400" />
            ) : (
                <Zap className="w-5 h-5 text-green-500" />
            )}
          </button>

            {showThemeDropdown && (
              <LiquidGlass
                variant={isLight ? "light" : "dark"}
                className={cn(
                  "absolute top-full right-0 mt-2 w-20 rounded-xl z-50",
                  isLight ? "border border-slate-200/90" : "border border-white/10"
                )}
                contentClassName="p-2 space-y-1"
              >
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'light' 
                        ? "bg-yellow-500/20" 
                        : isLight
                          ? "hover:bg-slate-100"
                          : "hover:bg-white/10"
                    )}
                    title="Light theme"
                  >
                    <Sun className="w-5 h-5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'dark' 
                        ? "bg-blue-500/20" 
                        : isLight
                          ? "hover:bg-slate-100"
                          : "hover:bg-white/10"
                    )}
                    title="Dark theme"
                  >
                    <Moon className="w-5 h-5 text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('matrix')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'matrix' 
                        ? "bg-green-500/20" 
                        : isLight
                          ? "hover:bg-slate-100"
                          : "hover:bg-white/10"
                    )}
                    title="Matrix theme"
                  >
                    <Zap className="w-5 h-5 text-green-500" />
                  </button>
              </LiquidGlass>
            )}
          </div>

          {/* Auth Status */}
          {authenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className={cn(
                  "flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors",
                  theme === 'light'
                    ? "bg-white/70 text-slate-800 hover:bg-white/90 border border-black/10"
                    : "glass hover:bg-white/15 text-white/90"
                )}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-mauve rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">Conectado</p>
                  <p className="text-xs text-muted-foreground">
                    {smartAccountAddress ? formatAddress(smartAccountAddress) : eoaAddress ? formatAddress(eoaAddress) : 'Wallet'}
                  </p>
                </div>
                <div className="text-left sm:hidden">
                  <p className="text-xs font-medium">Conectado</p>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </button>

              {showUserDropdown && (
                <LiquidGlass
                  variant={isLight ? "light" : "dark"}
                  className={cn(
                    "absolute top-full right-0 mt-2 w-80 rounded-xl z-50",
                    isLight ? "border border-slate-200/90" : "border border-white/10"
                  )}
                  contentClassName="p-3 space-y-3"
                >
                    {/* Email */}
                    <div className={cn("px-3 py-2 text-sm border-b", isLight ? "border-slate-200" : "border-white/10")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Email:</span>
                        </span>
                      </div>
                      <p className={cn("font-mono text-xs break-all", isLight ? "text-slate-800" : "")}>
                        {userEmail}
                      </p>
                    </div>
                    
                    {/* EOA Address */}
                    {eoaAddress && (
                      <div className={cn("px-3 py-2 text-sm border-b", isLight ? "border-slate-200" : "border-white/10")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <span>EOA (WaaP):</span>
                          </span>
                          <button
                            onClick={() => handleCopyAddress(eoaAddress, 'eoa')}
                            className={cn(
                              "flex items-center space-x-1 text-xs transition-colors",
                              isLight ? "text-slate-600 hover:text-slate-900" : "hover:text-white"
                            )}
                          >
                            {copiedAddress === 'eoa' ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className={cn("font-mono text-xs break-all", isLight ? "text-slate-800" : "")}>
                          {eoaAddress}
                        </p>
                      </div>
                    )}
                    
                    {/* Smart Wallet Address */}
                    {isInitializing ? (
                      <div className={cn("px-3 py-2 text-sm border-b", isLight ? "border-slate-200" : "border-white/10")}>
                        <p className="text-xs text-muted-foreground">
                          Inicializando smart wallet...
                        </p>
                      </div>
                    ) : smartAccountAddress ? (
                      <div className={cn("px-3 py-2 text-sm border-b border-green-500/30", isLight ? "border-slate-200" : "border-white/10")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span>Smart Wallet (ZeroDev):</span>
                          </span>
                          <button
                            onClick={() => handleCopyAddress(smartAccountAddress, 'smart')}
                            className={cn(
                              "flex items-center space-x-1 text-xs transition-colors",
                              isLight ? "text-slate-600 hover:text-slate-900" : "hover:text-white"
                            )}
                          >
                            {copiedAddress === 'smart' ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className={cn("font-mono text-xs break-all", isLight ? "text-slate-800" : "")}>
                          {smartAccountAddress}
                        </p>
                      </div>
                    ) : (
                      <div className={cn("px-3 py-2 text-sm border-b", isLight ? "border-slate-200" : "border-white/10")}>
                        <p className="text-xs text-yellow-500">
                          Smart wallet no disponible
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-xl transition-colors",
                        isLight ? "hover:bg-red-50 text-red-600" : "hover:bg-white/15 text-red-400"
                      )}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Desconectar</span>
                    </button>
                </LiquidGlass>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={!ready}
              className="btn-primary flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium hidden sm:inline">
                {ready ? 'Inicia Sesión' : 'Cargando...'}
              </span>
              <span className="font-medium sm:hidden">
                {ready ? 'Inicia' : '...'}
              </span>
            </button>
          )}
        </div>
      </LiquidGlass>

      {/* Click outside handlers */}
      {showUserDropdown && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowUserDropdown(false)}
        />
      )}
      {showThemeDropdown && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowThemeDropdown(false)}
        />
      )}
    </header>
  )
}
