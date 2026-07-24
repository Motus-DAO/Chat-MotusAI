'use client'

import { Award, ExternalLink } from 'lucide-react'
import { CERTIFICATE_IMAGE_PATH, certificateExplorerTxUrl } from '@/lib/certificates'
import { cn } from '@/lib/utils'

export type CertificateNftCardProps = {
  sessionId: number
  mintTxHash?: string
  label?: string
  className?: string
  compact?: boolean
}

export function CertificateNftCard({
  sessionId,
  mintTxHash,
  label,
  className,
  compact = false,
}: CertificateNftCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-green-500/30 bg-green-500/10 p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-green-400">
        <Award className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          {label || `Certificado · Sesión ${sessionId}`}
        </span>
      </div>

      <div className={cn('flex justify-center', compact ? 'mb-2' : 'mb-4')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CERTIFICATE_IMAGE_PATH}
          alt={`Certificado MotusDAO sesión ${sessionId}`}
          className={cn(
            'rounded-lg border border-white/10 object-cover',
            compact ? 'max-w-[160px] w-full' : 'max-w-[260px] w-full',
          )}
        />
      </div>

      <p className="text-xs text-muted-foreground">Session ID: {sessionId}</p>
      {mintTxHash && (
        <a
          href={certificateExplorerTxUrl(mintTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-green-300 underline-offset-2 hover:underline"
        >
          Ver en Celoscan
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
