'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { MatrixColorSelector } from '@/components/profile/MatrixColorSelector'
import { User, Save, Edit, Wallet, Settings, Loader, AlertCircle, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import { useRouter } from 'next/navigation'
import { CertificateNftCard } from '@/components/certificates/CertificateNftCard'
import { DEFAULT_ATTENDANCE_SESSION_ID } from '@/lib/certificates'
import {
  loadCertificates,
  upsertCertificateFromChain,
  type StoredCertificate,
} from '@/lib/certificate-storage'
import Link from 'next/link'

interface ProfileData {
  nombre: string
  telefono: string
  email: string
}

interface UserData {
  id: string
  email: string
  role: string
  eoaAddress: string
}

const PLACEHOLDER_EMAIL_SUFFIX = '@users.motusdao.local'

function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(PLACEHOLDER_EMAIL_SUFFIX))
}

export default function PerfilPage() {
  const router = useRouter()
  const { role, setMatrixColor } = useUIStore()
  const { authenticated, user, ready } = useWaaP()
  const { wallets } = useWaaPWallets()
  const eoaAddress = getEOAAddress(wallets) || user?.wallet?.address || null

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
    email: '',
  })
  const [userData, setUserData] = useState<UserData | null>(null)
  const [certificates, setCertificates] = useState<StoredCertificate[]>([])

  // MetaMask/wallet: no OAuth email → placeholder until the user sets a real one.
  // Google/social: email comes from WaaP and stays locked.
  const emailEditable =
    !resolvedEmail &&
    (!userData?.email || isPlaceholderEmail(userData.email))

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/')
    }
  }, [ready, authenticated, router])

  // Load minted attendance / MotusAI certificates for this wallet
  useEffect(() => {
    const loadNfts = async () => {
      if (!ready || !authenticated || !eoaAddress) {
        setCertificates([])
        return
      }

      let local = loadCertificates(eoaAddress)
      try {
        const response = await fetch(
          `/api/certificados/mint?address=${encodeURIComponent(eoaAddress)}&sessionId=${DEFAULT_ATTENDANCE_SESSION_ID}`,
        )
        if (response.ok) {
          const payload = (await response.json()) as {
            alreadyMinted?: boolean
            sessionId?: number
            label?: string
          }
          if (payload.alreadyMinted) {
            local = upsertCertificateFromChain(
              eoaAddress,
              payload.sessionId ?? DEFAULT_ATTENDANCE_SESSION_ID,
              {
                label: payload.label || 'MasterClass MotusDAO',
                source: 'masterclass',
              },
            )
          }
        }
      } catch {
        // keep local
      }
      setCertificates(local)
    }

    void loadNfts()
  }, [ready, authenticated, eoaAddress])

  // Avoid infinite "Cargando perfil..." if wallet never hydrates after Google login.
  useEffect(() => {
    if (!ready || !authenticated || eoaAddress) return
    const t = window.setTimeout(() => {
      setIsLoading((loading) => {
        if (!loading) return loading
        setError(
          'Tu sesión WaaP está activa, pero la wallet aún no está lista. Recarga la página o vuelve a iniciar sesión.',
        )
        return false
      })
    }, 8000)
    return () => window.clearTimeout(t)
  }, [ready, authenticated, eoaAddress])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!ready || !authenticated) return

      // Wait until we at least have a wallet or WaaP id; don't spin forever.
      if (!eoaAddress && !waapId) {
        setIsLoading(false)
        setError('No se pudo leer la wallet de WaaP. Cierra sesión e inicia de nuevo.')
        return
      }

      if (!eoaAddress) {
        // Authenticated but wallets not hydrated yet — keep spinner briefly.
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const syncResponse = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resolvedEmail || undefined,
            eoaAddress,
            waapId,
          }),
        })

        if (!syncResponse.ok) {
          const syncErr = await syncResponse.json().catch(() => ({}))
          throw new Error(
            (syncErr as { error?: string }).error ||
              'No se pudo sincronizar tu cuenta WaaP',
          )
        }

        const syncData = await syncResponse.json()

        const params = new URLSearchParams()
        if (waapId) params.append('privyId', waapId)
        if (resolvedEmail) params.append('email', resolvedEmail)
        if (syncData?.user?.id) params.append('userId', syncData.user.id)

        const response = await fetch(`/api/profile?${params.toString()}`)

        if (!response.ok) {
          if (response.status === 404) {
            setUserData(syncData?.user || null)
            setProfileData((prev) => ({
              ...prev,
              email:
                isPlaceholderEmail(syncData?.user?.email)
                  ? ''
                  : syncData?.user?.email || resolvedEmail || '',
            }))
            setError(
              'Aún no tienes perfil completo. Agrega tu nombre y email para comenzar.',
            )
            setIsLoading(false)
            return
          }
          throw new Error('Error al cargar el perfil')
        }

        const data = await response.json()

        if (data.profile) {
          setHasExistingProfile(true)
          const dbEmail = data.user?.email || syncData?.user?.email || ''
          setProfileData({
            nombre: data.profile.nombre || '',
            telefono: data.profile.telefono || '',
            email: isPlaceholderEmail(dbEmail) ? '' : dbEmail || resolvedEmail || '',
          })
        }

        if (data.user) {
          setUserData(data.user)
          if (!data.profile) {
            setProfileData((prev) => ({
              ...prev,
              email: isPlaceholderEmail(data.user.email)
                ? ''
                : data.user.email || '',
            }))
          }
        } else if (syncData?.user) {
          setUserData(syncData.user)
          setProfileData((prev) => ({
            ...prev,
            email: isPlaceholderEmail(syncData.user.email)
              ? ''
              : syncData.user.email || '',
          }))
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar el perfil')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchProfile()
  }, [ready, authenticated, resolvedEmail, waapId, eoaAddress])

  const handleSave = async () => {
    if (!userData?.id) {
      setError('No se puede guardar: ID de usuario no disponible')
      return
    }

    if (emailEditable) {
      const email = profileData.email.trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Ingresa un email válido para tu cuenta.')
        return
      }
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
          email: emailEditable
            ? profileData.email.trim().toLowerCase()
            : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el perfil')
      }

      const saved = await response.json()
      setHasExistingProfile(true)
      setIsEditing(false)
      if (saved.user) {
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                email: saved.user.email || prev.email,
                eoaAddress: saved.user.eoaAddress || prev.eoaAddress,
              }
            : {
                id: saved.user.id,
                email: saved.user.email,
                role: saved.user.role || role,
                eoaAddress: saved.user.eoaAddress || eoaAddress || '',
              },
        )
        setProfileData((prev) => ({
          ...prev,
          email: saved.user.email || prev.email,
        }))
      }
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
                        <p className="text-sm font-mono text-center break-all">
                          {profileData.email ||
                            (isPlaceholderEmail(userData?.email)
                              ? 'Sin email — edita tu perfil'
                              : userData?.email || userEmail)}
                        </p>
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
                      <input
                        type="email"
                        value={
                          emailEditable
                            ? profileData.email
                            : userData?.email || userEmail
                        }
                        onChange={(e) =>
                          handleInputChange('email', e.target.value)
                        }
                        disabled={!isEditing || !emailEditable}
                        placeholder={
                          emailEditable
                            ? 'tu@email.com'
                            : undefined
                        }
                        className="w-full p-3 glass-card border border-white/10 rounded-lg disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {emailEditable
                          ? 'Login con wallet: añade tu email para contactarte.'
                          : 'Email gestionado por WaaP (Google/social).'}
                      </p>
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
                    <Award className="w-6 h-6 mr-3 text-mauve-500" />
                    Mis certificados NFT
                  </h3>
                  {certificates.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {certificates.map((cert) => (
                        <CertificateNftCard
                          key={cert.sessionId}
                          sessionId={cert.sessionId}
                          mintTxHash={cert.mintTxHash}
                          label={cert.label}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                      Aún no tienes certificados minteados. Puedes reclamar el de
                      MasterClass o finalizar una sesión en MotusAI.
                    </p>
                  )}
                  <Link
                    href="/certificados"
                    className="mt-4 inline-flex text-sm text-mauve-400 underline-offset-2 hover:underline"
                  >
                    Ir a Certificados →
                  </Link>
                </GlassCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55 }} className="mt-8">
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
