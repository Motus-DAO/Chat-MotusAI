export const CERTIFICATE_IMAGE_PATH = '/NFT%20.jpg'

export const DEFAULT_ATTENDANCE_SESSION_ID = Number(
  process.env.NEXT_PUBLIC_ATTENDANCE_SESSION_ID ||
    process.env.ATTENDANCE_SESSION_ID ||
    '20260508',
)

export function certificateImageUrl(origin?: string): string {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  if (!base) return CERTIFICATE_IMAGE_PATH
  return `${base.replace(/\/$/, '')}${CERTIFICATE_IMAGE_PATH}`
}

export function certificateExplorerTxUrl(txHash: string): string {
  return `https://celoscan.io/tx/${txHash}`
}

export function certificateExplorerTokenUrl(
  contractAddress: string,
  sessionId: number | string,
): string {
  return `https://celoscan.io/token/${contractAddress}?a=${sessionId}`
}

export function newMotusSessionId(): number {
  // Unique per session end; fits safely in JS number / uint256.
  return Date.now()
}
