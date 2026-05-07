import { NextResponse } from 'next/server'

const DEFAULT_SESSION_ID = Number(process.env.ATTENDANCE_SESSION_ID || '20260508')

export async function GET(request: Request) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin

  const imageUrl = `${appUrl}/NFT%20.jpg`

  return NextResponse.json({
    name: 'MotusDAO Attendance Certificate - MasterClass 07/05/2026',
    description:
      'Certificado de asistencia para psicologos que participaron en la sesion de lanzamiento MasterClass de MotusDAO.',
    image: imageUrl,
    external_url: `${appUrl}/certificados`,
    attributes: [
      { trait_type: 'Type', value: 'Attendance Certificate' },
      { trait_type: 'Event', value: 'MasterClass' },
      { trait_type: 'Date', value: '2026-05-07' },
      { trait_type: 'Session ID', value: String(DEFAULT_SESSION_ID) },
    ],
  })
}
