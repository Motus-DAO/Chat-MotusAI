'use client'

export type StoredCertificate = {
  sessionId: number
  recipient: string
  mintTxHash?: string
  faucetTxHash?: string
  mintedAt: number
  label?: string
  source?: 'masterclass' | 'motusai'
}

function storageKey(wallet: string): string {
  return `motus.certificates.v1:${wallet.toLowerCase()}`
}

export function loadCertificates(wallet: string): StoredCertificate[] {
  if (typeof window === 'undefined' || !wallet) return []
  try {
    const raw = window.localStorage.getItem(storageKey(wallet))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredCertificate[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c) =>
        c &&
        typeof c.sessionId === 'number' &&
        typeof c.recipient === 'string',
    )
  } catch {
    return []
  }
}

export function saveCertificate(
  wallet: string,
  cert: StoredCertificate,
): StoredCertificate[] {
  if (typeof window === 'undefined' || !wallet) return []
  const existing = loadCertificates(wallet)
  const next = [
    cert,
    ...existing.filter((c) => c.sessionId !== cert.sessionId),
  ].sort((a, b) => b.mintedAt - a.mintedAt)
  try {
    window.localStorage.setItem(storageKey(wallet), JSON.stringify(next))
  } catch {
    // ignore quota
  }
  return next
}

export function upsertCertificateFromChain(
  wallet: string,
  sessionId: number,
  extras?: Partial<StoredCertificate>,
): StoredCertificate[] {
  const existing = loadCertificates(wallet)
  const found = existing.find((c) => c.sessionId === sessionId)
  if (found) {
    return existing
  }
  return saveCertificate(wallet, {
    sessionId,
    recipient: wallet,
    mintedAt: extras?.mintedAt ?? Date.now(),
    mintTxHash: extras?.mintTxHash,
    faucetTxHash: extras?.faucetTxHash,
    label: extras?.label ?? `Sesión ${sessionId}`,
    source: extras?.source ?? 'masterclass',
  })
}
