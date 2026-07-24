'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Coins,
  Copy,
  Loader2,
  ScrollText,
  Wallet,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CertificateNftCard } from '@/components/certificates/CertificateNftCard'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import { DEFAULT_ATTENDANCE_SESSION_ID } from '@/lib/certificates'
import {
  loadCertificates,
  saveCertificate,
  upsertCertificateFromChain,
  type StoredCertificate,
} from '@/lib/certificate-storage'

type FaucetResponse = {
  success?: boolean
  txHash?: string
  amount?: string
  error?: string
  retryInMinutes?: number
}

type MintResponse = {
  success?: boolean
  mintTxHash?: string
  faucetTxHash?: string
  amount?: string
  sessionId?: number
  recipient?: string
  alreadyMinted?: boolean
  imageUrl?: string
  label?: string
  error?: string
}

export default function CertificadosPage() {
  const { ready, authenticated, login } = useWaaP()
  const { wallets } = useWaaPWallets()
  const connectedAddress = useMemo(() => getEOAAddress(wallets), [wallets])

  const [isRequesting, setIsRequesting] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isCheckingMintStatus, setIsCheckingMintStatus] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied] = useState(false)
  const [faucetStatus, setFaucetStatus] = useState<FaucetResponse | null>(null)
  const [mintStatus, setMintStatus] = useState<MintResponse | null>(null)
  const [certificates, setCertificates] = useState<StoredCertificate[]>([])

  useEffect(() => {
    const checkMintStatus = async () => {
      if (!authenticated || !connectedAddress) {
        setMintStatus(null)
        setCertificates([])
        return
      }

      setIsCheckingMintStatus(true)
      try {
        let local = loadCertificates(connectedAddress)

        const response = await fetch(
          `/api/certificados/mint?address=${encodeURIComponent(connectedAddress)}&sessionId=${DEFAULT_ATTENDANCE_SESSION_ID}`,
        )
        const payload = (await response.json()) as MintResponse

        if (payload.alreadyMinted) {
          local = upsertCertificateFromChain(
            connectedAddress,
            payload.sessionId ?? DEFAULT_ATTENDANCE_SESSION_ID,
            {
              label: payload.label || 'MasterClass MotusDAO',
              source: 'masterclass',
            },
          )
          setMintStatus({
            success: true,
            alreadyMinted: true,
            sessionId: payload.sessionId ?? DEFAULT_ATTENDANCE_SESSION_ID,
            recipient: payload.recipient,
            imageUrl: payload.imageUrl,
            label: payload.label || 'MasterClass MotusDAO',
          })
        } else {
          setMintStatus(null)
        }

        setCertificates(local)
      } catch {
        setCertificates(loadCertificates(connectedAddress))
      } finally {
        setIsCheckingMintStatus(false)
      }
    }

    void checkMintStatus()
  }, [authenticated, connectedAddress])

  const handleCopy = async () => {
    if (!connectedAddress) return
    await navigator.clipboard.writeText(connectedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleRequestGas = async () => {
    if (!connectedAddress || isRequesting) return

    setIsRequesting(true)
    setFaucetStatus(null)

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: connectedAddress }),
      })

      const payload = (await response.json()) as FaucetResponse
      setFaucetStatus(payload)
    } catch {
      setFaucetStatus({ error: 'No se pudo conectar con el faucet. Intenta de nuevo.' })
    } finally {
      setIsRequesting(false)
    }
  }

  const handleMintCertificate = async () => {
    if (!connectedAddress || isMinting) return

    setIsMinting(true)
    setMintStatus(null)

    try {
      const response = await fetch('/api/certificados/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: connectedAddress,
          sessionId: DEFAULT_ATTENDANCE_SESSION_ID,
          label: 'MasterClass MotusDAO',
        }),
      })

      const payload = (await response.json()) as MintResponse

      if (payload.alreadyMinted || payload.success) {
        const sessionId = payload.sessionId ?? DEFAULT_ATTENDANCE_SESSION_ID
        const next = saveCertificate(connectedAddress, {
          sessionId,
          recipient: connectedAddress,
          mintTxHash: payload.mintTxHash,
          faucetTxHash: payload.faucetTxHash,
          mintedAt: Date.now(),
          label: payload.label || 'MasterClass MotusDAO',
          source: 'masterclass',
        })
        setCertificates(next)
        setMintStatus({
          ...payload,
          success: true,
          alreadyMinted: Boolean(payload.alreadyMinted || payload.success),
        })
      } else {
        setMintStatus(payload)
      }
    } catch {
      setMintStatus({ error: 'No se pudo mintear tu certificado. Intenta de nuevo.' })
    } finally {
      setIsMinting(false)
    }
  }

  const hasDefaultCert = certificates.some(
    (c) => c.sessionId === DEFAULT_ATTENDANCE_SESSION_ID,
  )

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-mauve">
            <Award className="h-7 w-7 text-white" />
          </div>
          <GradientText as="h1" className="text-4xl font-bold md:text-5xl">
            Certificados
          </GradientText>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Tus NFTs de asistencia y de sesiones MotusAI. También puedes finalizar
            una sesión en el chat para mintear un certificado nuevo.
          </p>
        </div>

        <GlassCard className="space-y-6 p-6 md:p-8">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="mb-2 text-sm text-muted-foreground">Wallet conectada</p>
            {authenticated && connectedAddress ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="break-all font-mono text-sm">{connectedAddress}</p>
                <CTAButton variant="secondary" size="sm" onClick={() => void handleCopy()}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copiada' : 'Copiar'}
                </CTAButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Necesitas iniciar sesión para conectar una wallet.
                </p>
                <CTAButton onClick={() => void login()} disabled={!ready}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {ready ? 'Conectar wallet' : 'Cargando...'}
                </CTAButton>
              </div>
            )}
          </div>

          {certificates.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Tus certificados NFT</p>
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
            </div>
          )}

          <div className="rounded-xl border border-white/10 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Certificado MasterClass (NFT)
            </p>
            <CTAButton
              onClick={() => void handleMintCertificate()}
              disabled={
                !authenticated ||
                !connectedAddress ||
                isMinting ||
                isCheckingMintStatus ||
                hasDefaultCert
              }
            >
              {isMinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minteando...
                </>
              ) : isCheckingMintStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ScrollText className="mr-2 h-4 w-4" />
                  {hasDefaultCert
                    ? 'MasterClass ya minteado'
                    : 'Consigue tu certificado MasterClass'}
                </>
              )}
            </CTAButton>

            {mintStatus?.success && mintStatus.sessionId && !hasDefaultCert && (
              <div className="mt-4">
                <CertificateNftCard
                  sessionId={mintStatus.sessionId}
                  mintTxHash={mintStatus.mintTxHash}
                  label={mintStatus.label}
                />
                {mintStatus.amount && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gas enviado: {mintStatus.amount} CELO
                  </p>
                )}
              </div>
            )}

            {mintStatus?.error && !mintStatus.alreadyMinted && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {mintStatus.error}
                {mintStatus.recipient && (
                  <p className="mt-2 break-all font-mono text-xs text-red-200/80">
                    Wallet: {mintStatus.recipient}
                  </p>
                )}
              </div>
            )}

            {hasDefaultCert && (
              <p className="mt-3 flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tu NFT MasterClass está arriba en la galería.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="text-sm text-muted-foreground">Configuración avanzada</p>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-4">
                <p className="mb-3 text-sm text-muted-foreground">Solicitar gas manualmente</p>
                <CTAButton
                  onClick={() => void handleRequestGas()}
                  disabled={!authenticated || !connectedAddress || isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Pedir gas al faucet
                    </>
                  )}
                </CTAButton>

                {faucetStatus?.success && (
                  <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
                    <div className="mb-2 flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Gas enviado correctamente</span>
                    </div>
                    <p className="text-muted-foreground">
                      Recibiste {faucetStatus.amount} CELO. Tx:
                    </p>
                    <p className="mt-1 break-all font-mono text-xs">{faucetStatus.txHash}</p>
                  </div>
                )}

                {faucetStatus?.error && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {faucetStatus.error}
                    {typeof faucetStatus.retryInMinutes === 'number' && (
                      <span className="ml-1">
                        Vuelve a intentar en {faucetStatus.retryInMinutes} minutos.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
