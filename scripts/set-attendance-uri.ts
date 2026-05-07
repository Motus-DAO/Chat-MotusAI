import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'
import { celoMainnet } from '../lib/celo'

dotenv.config({ path: '.env.local' })

const attendanceAbi = parseAbi(['function setURI(string newuri)'])

async function main() {
  const contractAddress = process.env.ATTENDANCE_1155_ADDRESS as `0x${string}` | undefined
  const uri =
    process.env.ATTENDANCE_METADATA_URI ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/certificados/metadata`
      : undefined)
  const minterPk = process.env.MOTUS_PROFILE_MINTER_PK || process.env.DEPLOYER_PRIVATE_KEY

  if (!contractAddress) throw new Error('Missing ATTENDANCE_1155_ADDRESS')
  if (!uri) {
    throw new Error(
      'Missing ATTENDANCE_METADATA_URI (or NEXT_PUBLIC_APP_URL) in .env.local',
    )
  }
  if (!minterPk) throw new Error('Missing MOTUS_PROFILE_MINTER_PK/DEPLOYER_PRIVATE_KEY')

  const normalizedPk = minterPk.startsWith('0x')
    ? (minterPk as `0x${string}`)
    : (`0x${minterPk}` as `0x${string}`)
  const account = privateKeyToAccount(normalizedPk)

  const walletClient = createWalletClient({
    account,
    chain: celoMainnet,
    transport: http(),
  })

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: attendanceAbi,
    functionName: 'setURI',
    args: [uri],
    account,
    chain: celoMainnet,
  })

  console.log('setURI tx:', txHash)
  console.log('URI set to:', uri)
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
