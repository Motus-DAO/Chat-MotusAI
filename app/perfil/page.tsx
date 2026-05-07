'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { MatrixColorSelector } from '@/components/profile/MatrixColorSelector'
import { User, Save, Edit, Wallet, Settings, Loader, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import { useRouter } from 'next/navigation'

interface ProfileData {
  nombre: string
  telefono: string
}

interface UserData {
  id: string
  email: string
  role: string
  eoaAddress: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { role, setMatrixColor } = useUIStore()
  const { authenticated, user, ready } = useWaaP()
  const { wallets } = useWaaPWallets()
  const eoaAddress = getEOAAddress(wallets)

  const resolvedEmail = user?.email?.address || user?.google?.email || ''
  const userEmail = resolvedEmail || 'No disponible'
  const waapId = user?.id

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasExistingProfile, setHasExistingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    nombre: '',
    telefono: '',
  })
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/')
    }
  }, [ready, authenticated, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!ready || !authenticated || !resolvedEmail || !eoaAddress) return

      setIsLoading(true)
      setError(null)

      try {
        const syncResponse = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            eoaAddress,
            waapId,
          }),
        })
        const syncData = syncResponse.ok ? await syncResponse.json() : null

        const params = new URLSearchParams()
        if (waapId) params.append('privyId', waapId)
        if (resolvedEmail) params.append('email', resolvedEmail)

        const response = await fetch(`/api/profile?${params.toString()}`)

        if (!response.ok) {
          if (response.status === 404) {
            setUserData(syncData?.user || null)
            setError('Aún no tienes perfil completo. Agrega tu nombre y foto para comenzar.')
            setIsLoading(false)
            return
          }
          throw new Error('Error al cargar el perfil')
        }

        const data = await response.json()

        if (data.profile) {
          setHasExistingProfile(true)
          setProfileData({
            nombre: data.profile.nombre || '',
            telefono: data.profile.telefono || '',
          })
        }

        if (data.user) {
          setUserData(data.user)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar el perfil')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [ready, authenticated, resolvedEmail, waapId, eoaAddress])

  const handleSave = async () => {
    if (!userData?.id) {
      setError('No se puede guardar: ID de usuario no disponible')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/profile', {
        method: hasExistingProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
          nombre: profileData.nombre,
          apellido: '',
          telefono: profileData.telefono,
          fechaNacimiento: '2000-01-01',
          ciudad: '',
          pais: '',
          bio: '',
          language: 'es',
          avatarUrl: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el perfil')
      }

      await response.json()
      setHasExistingProfile(true)
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handleMatrixColorChange = (color: 'green' | 'red' | 'orange' | 'blue' | 'pink') => {
    setMatrixColor(color)
  }

  const displayName = profileData.nombre || 'Usuario MotusDAO'

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-mauve-500" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-mauve-500" />
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-xl flex items-center justify-center mr-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl md:text-5xl font-bold">
                  Mi Perfil
                </GradientText>
                <p className="text-muted-foreground">Gestiona tu información personal y wallet</p>
              </div>
            </div>
          </motion.div>

          {error && (
            <div className="mb-6 p-4 glass-card rounded-xl border border-red-500/20 bg-red-500/10">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <GlassCard className="p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 bg-gradient-mauve rounded-full flex items-center justify-center mx-auto">
                      <User className="w-16 h-16 text-white" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mb-2">{displayName}</h2>
                  <p className="text-muted-foreground mb-4 capitalize">{userData?.role || role}</p>

                  {authenticated && (
                    <div className="mb-4 space-y-3">
                      <div className="p-3 glass-card rounded-lg">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-mauve-500" />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                        <p className="text-sm font-mono text-center break-all">{userData?.email || userEmail}</p>
                      </div>

                      {(userData?.eoaAddress || eoaAddress) && (
                        <div className="p-3 glass-card rounded-lg">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <Wallet className="w-4 h-4 text-mauve-500" />
                            <span className="text-xs text-muted-foreground">Wallet EOA</span>
                          </div>
                          <p className="text-xs font-mono text-center text-muted-foreground mt-1 break-all">{userData?.eoaAddress || eoaAddress}</p>
                        </div>
                      )}

                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>

            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
                <GlassCard className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Información Personal</h3>
                    <CTAButton variant={isEditing ? 'primary' : 'secondary'} size="sm" onClick={() => (isEditing ? handleSave() : setIsEditing(true))} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : isEditing ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </>
                      )}
                    </CTAButton>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre</label>
                      <input type="text" value={profileData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} disabled={!isEditing} className="w-full p-3 glass-card border border-white/10 rounded-lg disabled:opacity-50" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Teléfono</label>
                      <input type="tel" value={profileData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} disabled={!isEditing} className="w-full p-3 glass-card border border-white/10 rounded-lg disabled:opacity-50" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input type="email" value={userData?.email || userEmail} disabled className="w-full p-3 glass-card border border-white/10 rounded-lg disabled:opacity-50" />
                      <p className="text-xs text-muted-foreground mt-1">Email gestionado por WaaP</p>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <MatrixColorSelector onColorChange={handleMatrixColorChange} />
                    </div>
                  </form>
                </GlassCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="mt-8">
                <GlassCard className="p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <Settings className="w-6 h-6 mr-3 text-mauve-500" />
                    Configuración
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Esta versión del producto está enfocada en onboarding, perfil clínico y chat personalizado.
                  </p>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
