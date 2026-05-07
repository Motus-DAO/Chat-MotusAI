import { NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, isAddress, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celoMainnet } from '@/lib/celo'

const attendanceAbi = parseAbi([
  'function mintAttendance(address to, uint256 sessionId)',
  'function hasCertificateForSession(uint256 sessionId, address wallet) view returns (bool)',
])

const DEFAULT_SESSION_ID = Number(process.env.ATTENDANCE_SESSION_ID || '20260508')

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const sessionId = Number(searchParams.get('sessionId') ?? DEFAULT_SESSION_ID)

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 })
    }

    const contractAddress = process.env.ATTENDANCE_1155_ADDRESS as `0x${string}` | undefined
    if (!contractAddress || !isAddress(contractAddress)) {
      return NextResponse.json(
        { error: 'Contrato de certificados no configurado' },
        { status: 500 },
      )
    }

    const publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http(),
    })

    const alreadyMinted = await publicClient.readContract({
      address: contractAddress,
      abi: attendanceAbi,
      functionName: 'hasCertificateForSession',
      args: [BigInt(sessionId), address as `0x${string}`],
    })

    return NextResponse.json({
      success: true,
      recipient: address,
      sessionId,
      alreadyMinted,
    })
  } catch (error) {
    console.error('[AttendanceStatus] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error consultando estado de certificado',
      },
      { status: 500 },
    )
  }
}

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
      return NextResponse.json(
        { error: 'Contrato de certificados no configurado' },
        { status: 500 },
      )
    }

    const minterPk = process.env.MOTUS_PROFILE_MINTER_PK || process.env.DEPLOYER_PRIVATE_KEY
    if (!minterPk) {
      return NextResponse.json(
        { error: 'Clave de minteo no configurada en servidor' },
        { status: 500 },
      )
    }

    const normalizedPk = minterPk.startsWith('0x')
      ? (minterPk as `0x${string}`)
      : (`0x${minterPk}` as `0x${string}`)

    const account = privateKeyToAccount(normalizedPk)
    const walletClient = createWalletClient({
      account,
      chain: celoMainnet,
      transport: http(),
    })
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
          error: 'Esta wallet ya minteo su certificado para esta sesión.',
        },
        { status: 409 },
      )
    }

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: attendanceAbi,
      functionName: 'mintAttendance',
      args: [recipient as `0x${string}`, BigInt(sessionId)],
      chain: celoMainnet,
      account,
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    return NextResponse.json({
      success: true,
      txHash,
      contractAddress,
      sessionId,
      recipient,
    })
  } catch (error) {
    console.error('[AttendanceMint] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error minting certificado',
      },
      { status: 500 },
    )
  }
}
