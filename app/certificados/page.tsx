'use client'

import { useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, ChevronDown, Coins, Copy, Loader2, ScrollText, Wallet } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'

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

  useEffect(() => {
    const checkMintStatus = async () => {
      if (!authenticated || !connectedAddress) {
        setMintStatus(null)
        return
      }

      setIsCheckingMintStatus(true)
      try {
        const response = await fetch(
          `/api/certificados/mint?address=${encodeURIComponent(connectedAddress)}`,
        )
        const payload = (await response.json()) as MintResponse
        if (payload.alreadyMinted) {
          setMintStatus({
            success: false,
            alreadyMinted: true,
            sessionId: payload.sessionId,
            recipient: payload.recipient,
            error: 'Esta wallet ya tiene certificado para esta sesión.',
          })
        } else {
          setMintStatus(null)
        }
      } catch {
        // Non-blocking: user can still try minting manually.
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
        body: JSON.stringify({ address: connectedAddress }),
      })

      const payload = (await response.json()) as MintResponse
      setMintStatus(payload)
    } catch {
      setMintStatus({ error: 'No se pudo mintear tu certificado. Intenta de nuevo.' })
    } finally {
      setIsMinting(false)
    }
  }

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
            Conecta tu wallet y solicita gas para cubrir fees en tus interacciones onchain.
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

          <div className="rounded-xl border border-white/10 p-4">
            <p className="mb-3 text-sm text-muted-foreground">Certificado de asistencia (NFT)</p>
            <CTAButton
              onClick={() => void handleMintCertificate()}
              disabled={!authenticated || !connectedAddress || isMinting || isCheckingMintStatus || mintStatus?.alreadyMinted}
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
                  {mintStatus?.alreadyMinted ? 'Certificado ya minteado' : 'Consigue tu certificado'}
                </>
              )}
            </CTAButton>

            {mintStatus?.success && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Gas + certificado procesados correctamente</span>
                </div>
                <p className="text-muted-foreground">Session ID: {mintStatus.sessionId}</p>
                {mintStatus.amount && (
                  <p className="text-muted-foreground">Gas enviado: {mintStatus.amount} CELO</p>
                )}
                {mintStatus.faucetTxHash && (
                  <p className="mt-1 break-all font-mono text-xs">
                    Faucet Tx: {mintStatus.faucetTxHash}
                  </p>
                )}
                {mintStatus.mintTxHash && (
                  <p className="mt-1 break-all font-mono text-xs">
                    Mint Tx: {mintStatus.mintTxHash}
                  </p>
                )}
                <div className="mt-4 flex justify-center">
                  <img
                    src="/NFT%20.jpg"
                    alt="Certificado MasterClass MotusDAO"
                    className="w-full max-w-[260px] rounded-lg border border-white/10"
                  />
                </div>
              </div>
            )}

            {mintStatus?.error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {mintStatus.error}
                {mintStatus.recipient && (
                  <p className="mt-2 break-all font-mono text-xs text-red-200/80">
                    Wallet: {mintStatus.recipient}
                  </p>
                )}
              </div>
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
                      <span className="ml-1">Vuelve a intentar en {faucetStatus.retryInMinutes} minutos.</span>
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
