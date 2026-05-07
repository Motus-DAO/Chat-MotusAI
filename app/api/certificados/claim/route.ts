import { NextResponse } from 'next/server'
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
  parseEther,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celoMainnet } from '@/lib/celo'

const attendanceAbi = parseAbi([
  'function mintAttendance(address to, uint256 sessionId)',
  'function hasCertificateForSession(uint256 sessionId, address wallet) view returns (bool)',
])

const DEFAULT_SESSION_ID = Number(process.env.ATTENDANCE_SESSION_ID || '20260508')
const FAUCET_AMOUNT = '0.01'

// Keep a simple per-address faucet throttle for this claim endpoint.
const lastClaimByAddress = new Map<string, number>()
const MIN_INTERVAL_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { address?: string; sessionId?: number }
      | null

    const recipient = body?.address
    const sessionId = Number(body?.sessionId ?? DEFAULT_SESSION_ID)

    if (!recipient || !isAddress(recipient)) {
      return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 })
    }
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 })
    }

    const contractAddress = process.env.ATTENDANCE_1155_ADDRESS as `0x${string}` | undefined
    if (!contractAddress || !isAddress(contractAddress)) {
      return NextResponse.json({ error: 'Contrato no configurado' }, { status: 500 })
    }

    const faucetPk = process.env.CELO_FAUCET_PRIVATE_KEY
    const minterPk = process.env.MOTUS_PROFILE_MINTER_PK || process.env.DEPLOYER_PRIVATE_KEY
    if (!faucetPk || !minterPk) {
      return NextResponse.json({ error: 'Claves del servidor no configuradas' }, { status: 500 })
    }

    const normalizedFaucetPk = faucetPk.startsWith('0x')
      ? (faucetPk as `0x${string}`)
      : (`0x${faucetPk}` as `0x${string}`)
    const normalizedMinterPk = minterPk.startsWith('0x')
      ? (minterPk as `0x${string}`)
      : (`0x${minterPk}` as `0x${string}`)

    const faucetAccount = privateKeyToAccount(normalizedFaucetPk)
    const minterAccount = privateKeyToAccount(normalizedMinterPk)

    const publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http(),
    })

    const alreadyMinted = await publicClient.readContract({
      address: contractAddress,
      abi: attendanceAbi,
      functionName: 'hasCertificateForSession',
      args: [BigInt(sessionId), recipient as `0x${string}`],
    })

    if (alreadyMinted) {
      return NextResponse.json(
        {
          success: false,
          alreadyMinted: true,
          recipient,
          sessionId,
          error: 'Esta wallet ya tiene certificado para esta sesión.',
        },
        { status: 409 },
      )
    }

    const recipientKey = recipient.toLowerCase()
    const now = Date.now()
    const last = lastClaimByAddress.get(recipientKey) ?? 0
    if (now - last < MIN_INTERVAL_MS) {
      const minutesLeft = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 60000)
      return NextResponse.json(
        {
          error: 'Has reclamado recientemente',
          retryInMinutes: minutesLeft,
        },
        { status: 429 },
      )
    }

    const faucetClient = createWalletClient({
      account: faucetAccount,
      chain: celoMainnet,
      transport: http(),
    })

    const faucetTxHash = await faucetClient.sendTransaction({
      to: recipient as `0x${string}`,
      value: parseEther(FAUCET_AMOUNT),
      chain: celoMainnet,
      account: faucetAccount,
    })

    await publicClient.waitForTransactionReceipt({ hash: faucetTxHash })
    lastClaimByAddress.set(recipientKey, now)

    const minterClient = createWalletClient({
      account: minterAccount,
      chain: celoMainnet,
      transport: http(),
    })

    const mintTxHash = await minterClient.writeContract({
      address: contractAddress,
      abi: attendanceAbi,
      functionName: 'mintAttendance',
      args: [recipient as `0x${string}`, BigInt(sessionId)],
      account: minterAccount,
      chain: celoMainnet,
    })

    await publicClient.waitForTransactionReceipt({ hash: mintTxHash })

    return NextResponse.json({
      success: true,
      recipient,
      sessionId,
      amount: FAUCET_AMOUNT,
      faucetTxHash,
      mintTxHash,
    })
  } catch (error) {
    console.error('[AttendanceClaim] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error reclamando certificado',
      },
      { status: 500 },
    )
  }
}
