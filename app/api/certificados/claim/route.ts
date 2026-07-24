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
import {
  CERTIFICATE_IMAGE_PATH,
  DEFAULT_ATTENDANCE_SESSION_ID,
} from '@/lib/certificates'

const attendanceAbi = parseAbi([
  'function mintAttendance(address to, uint256 sessionId)',
  'function hasCertificateForSession(uint256 sessionId, address wallet) view returns (bool)',
  'function sessionMintEnabled(uint256 sessionId) view returns (bool)',
  'function setSessionMintEnabled(uint256 sessionId, bool enabled)',
])

const FAUCET_AMOUNT = '0.01'
const lastClaimByAddress = new Map<string, number>()
const MIN_INTERVAL_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { address?: string; sessionId?: number; label?: string }
      | null

    const recipient = body?.address
    const sessionId = Number(body?.sessionId ?? DEFAULT_ATTENDANCE_SESSION_ID)

    if (!recipient || !isAddress(recipient)) {
      return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 })
    }
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 })
    }

    const contractAddress = process.env.ATTENDANCE_1155_ADDRESS as
      | `0x${string}`
      | undefined
    if (!contractAddress || !isAddress(contractAddress)) {
      return NextResponse.json({ error: 'Contrato no configurado' }, { status: 500 })
    }

    const faucetPk = process.env.CELO_FAUCET_PRIVATE_KEY
    const minterPk =
      process.env.MOTUS_PROFILE_MINTER_PK || process.env.DEPLOYER_PRIVATE_KEY
    if (!faucetPk || !minterPk) {
      return NextResponse.json(
        { error: 'Claves del servidor no configuradas' },
        { status: 500 },
      )
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
          imageUrl: CERTIFICATE_IMAGE_PATH,
          contractAddress,
          error: 'Esta wallet ya tiene certificado para esta sesión.',
        },
        { status: 409 },
      )
    }

    let faucetTxHash: `0x${string}` | undefined
    const balance = await publicClient.getBalance({
      address: recipient as `0x${string}`,
    })
    const needsFaucet = balance < parseEther('0.005')

    if (needsFaucet) {
      const recipientKey = recipient.toLowerCase()
      const now = Date.now()
      const last = lastClaimByAddress.get(recipientKey) ?? 0
      if (now - last < MIN_INTERVAL_MS) {
        const minutesLeft = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 60000)
        return NextResponse.json(
          {
            error:
              'Sin gas suficiente y el faucet está en cooldown. Espera un poco o pide gas en Certificados.',
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

      faucetTxHash = await faucetClient.sendTransaction({
        to: recipient as `0x${string}`,
        value: parseEther(FAUCET_AMOUNT),
        chain: celoMainnet,
        account: faucetAccount,
      })

      await publicClient.waitForTransactionReceipt({ hash: faucetTxHash })
      lastClaimByAddress.set(recipientKey, now)
    }

    const minterClient = createWalletClient({
      account: minterAccount,
      chain: celoMainnet,
      transport: http(),
    })

    // MotusAI sessions use unique ids — enable mint window if needed.
    const mintEnabled = await publicClient.readContract({
      address: contractAddress,
      abi: attendanceAbi,
      functionName: 'sessionMintEnabled',
      args: [BigInt(sessionId)],
    })

    if (!mintEnabled) {
      const enableTx = await minterClient.writeContract({
        address: contractAddress,
        abi: attendanceAbi,
        functionName: 'setSessionMintEnabled',
        args: [BigInt(sessionId), true],
        account: minterAccount,
        chain: celoMainnet,
      })
      await publicClient.waitForTransactionReceipt({ hash: enableTx })
    }

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
      amount: faucetTxHash ? FAUCET_AMOUNT : undefined,
      faucetTxHash,
      mintTxHash,
      imageUrl: CERTIFICATE_IMAGE_PATH,
      contractAddress,
      label: body?.label || `Sesión ${sessionId}`,
    })
  } catch (error) {
    console.error('[AttendanceClaim] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error reclamando certificado',
      },
      { status: 500 },
    )
  }
}
