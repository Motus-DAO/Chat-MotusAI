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
  Shield,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { identifyEmbeddedWallet } from '@/lib/wallet-utils'

export function Topbar() {
  const { sidebarOpen, setSidebarOpen, theme, setTheme } = useUIStore()

  const { ready, authenticated, user, login, logout } = useWaaP()
  const { wallets } = useWaaPWallets()

  const { smartAccountAddress, isInitializing } = useSmartAccount()

  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const eoaAddress = embeddedWallet?.address

  const userEmail = user?.email?.address || user?.google?.email || 'No disponible'

  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const userSyncRef = useRef<string | null>(null)

  useEffect(() => {
    const syncUser = async () => {
      if (!ready || !authenticated || !user) return

      const email = user?.email?.address || user?.google?.email
      const waapId = user?.id
      const activeAddress = smartAccountAddress || eoaAddress

      if (!email || !activeAddress) return

      const syncKey = `${email}:${activeAddress}`
      if (userSyncRef.current === syncKey) return

      try {
        const response = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
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
    <header
      className={cn(
        'fixed top-4 left-0 right-0 z-40 mx-2 sm:mx-4 max-w-full',
        // Avril glass-nav-modal + Hub-Psi rounded float
        'rounded-3xl border backdrop-blur-xl',
        theme === 'light'
          ? 'border-black/10 bg-white/55 shadow-[0_8px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.55)]'
          : 'border-white/14 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
        theme === 'matrix' &&
          'rounded-none border-[var(--matrix-border)] bg-black/90 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,65,0.1)]',
      )}
    >
      <div className="flex h-12 sm:h-16 items-center justify-between px-3 sm:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-foreground/5 rounded-xl transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden rounded-2xl border border-border bg-foreground/5 backdrop-blur-xl px-4 py-2 text-xs sm:block text-muted-foreground">
            MotusAI Chat
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="p-2 hover:bg-foreground/5 rounded-xl transition-colors focus-ring"
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
              <div className="absolute top-full right-0 mt-2 w-20 glass-strong border border-border rounded-xl shadow-lg z-50">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      'w-full flex items-center justify-center p-2 rounded-xl transition-colors',
                      theme === 'light' ? 'bg-yellow-500/20' : 'hover:bg-foreground/5',
                    )}
                    title="Light theme"
                  >
                    <Sun className="w-5 h-5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      'w-full flex items-center justify-center p-2 rounded-xl transition-colors',
                      theme === 'dark' ? 'bg-blue-500/20' : 'hover:bg-foreground/5',
                    )}
                    title="Dark theme"
                  >
                    <Moon className="w-5 h-5 text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('matrix')}
                    className={cn(
                      'w-full flex items-center justify-center p-2 rounded-xl transition-colors',
                      theme === 'matrix' ? 'bg-green-500/20' : 'hover:bg-foreground/5',
                    )}
                    title="Matrix theme"
                  >
                    <Zap className="w-5 h-5 text-green-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {authenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 glass hover:bg-foreground/5 rounded-xl transition-colors"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-mauve rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">Conectado</p>
                  <p className="text-xs text-muted-foreground">
                    {smartAccountAddress
                      ? formatAddress(smartAccountAddress)
                      : eoaAddress
                        ? formatAddress(eoaAddress)
                        : 'Wallet'}
                  </p>
                </div>
                <div className="text-left sm:hidden">
                  <p className="text-xs font-medium">Conectado</p>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </button>

              {showUserDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 glass-strong border border-border rounded-xl shadow-lg z-50 p-3 space-y-3">
                  <div className="px-3 py-2 text-sm border-b border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Email:</span>
                      </span>
                    </div>
                    <p className="font-mono text-xs break-all">{userEmail}</p>
                  </div>

                  {eoaAddress && (
                    <div className="px-3 py-2 text-sm border-b border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground flex items-center space-x-2">
                          <Wallet className="w-4 h-4" />
                          <span>EOA (WaaP):</span>
                        </span>
                        <button
                          onClick={() => handleCopyAddress(eoaAddress, 'eoa')}
                          className="flex items-center space-x-1 text-xs hover:text-foreground transition-colors"
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
                      <p className="font-mono text-xs break-all">{eoaAddress}</p>
                    </div>
                  )}

                  {isInitializing ? (
                    <div className="px-3 py-2 text-sm border-b border-border">
                      <p className="text-xs text-muted-foreground">
                        Inicializando smart wallet...
                      </p>
                    </div>
                  ) : smartAccountAddress ? (
                    <div className="px-3 py-2 text-sm border-b border-border border-green-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span>Smart Wallet (ZeroDev):</span>
                        </span>
                        <button
                          onClick={() =>
                            handleCopyAddress(smartAccountAddress, 'smart')
                          }
                          className="flex items-center space-x-1 text-xs hover:text-foreground transition-colors"
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
                      <p className="font-mono text-xs break-all">
                        {smartAccountAddress}
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm border-b border-border">
                      <p className="text-xs text-yellow-500">
                        Smart wallet no disponible
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-xl transition-colors hover:bg-red-500/10 text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Desconectar</span>
                  </button>
                </div>
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
      </div>

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
