import { readFile } from 'node:fs/promises'
import { uploadBuffer } from '@lighthouse-web3/sdk'
import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celoMainnet } from '../lib/celo'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const attendanceAbi = parseAbi(['function setURI(string newuri)'])

async function main() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY
  const contractAddress = process.env.ATTENDANCE_1155_ADDRESS as `0x${string}` | undefined
  const sessionId = Number(process.env.ATTENDANCE_SESSION_ID || '20260508')
  const minterPk = process.env.MOTUS_PROFILE_MINTER_PK || process.env.DEPLOYER_PRIVATE_KEY

  if (!apiKey) throw new Error('Missing LIGHTHOUSE_API_KEY')
  if (!contractAddress) throw new Error('Missing ATTENDANCE_1155_ADDRESS')
  if (!minterPk) throw new Error('Missing MOTUS_PROFILE_MINTER_PK/DEPLOYER_PRIVATE_KEY')

  const normalizedPk = minterPk.startsWith('0x')
    ? (minterPk as `0x${string}`)
    : (`0x${minterPk}` as `0x${string}`)

  const imageBuffer = await readFile('public/NFT .jpg')
  const imageUpload = await uploadBuffer(imageBuffer, apiKey, { cidVersion: 1 })
  const imageCid = (imageUpload.data as { Hash?: string })?.Hash
  if (!imageCid) throw new Error('Lighthouse did not return image CID')
  const imageUri = `ipfs://${imageCid}`

  const metadata = {
    name: 'MotusDAO Attendance Certificate - MasterClass 07/05/2026',
    description:
      'Certificado de asistencia para psicologos que participaron en la sesion de lanzamiento MasterClass de MotusDAO.',
    image: imageUri,
    external_url: 'https://motusdao.com/certificados',
    attributes: [
      { trait_type: 'Type', value: 'Attendance Certificate' },
      { trait_type: 'Event', value: 'MasterClass' },
      { trait_type: 'Date', value: '2026-05-07' },
      { trait_type: 'Session ID', value: String(sessionId) },
    ],
  }

  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2))
  const metadataUpload = await uploadBuffer(metadataBuffer, apiKey, { cidVersion: 1 })
  const metadataCid = (metadataUpload.data as { Hash?: string })?.Hash
  if (!metadataCid) throw new Error('Lighthouse did not return metadata CID')
  const metadataUri = `ipfs://${metadataCid}`

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
    args: [metadataUri],
    account,
    chain: celoMainnet,
  })

  console.log('Image URI:', imageUri)
  console.log('Metadata URI:', metadataUri)
  console.log('setURI tx:', txHash)
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
