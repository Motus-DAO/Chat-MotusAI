import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const eoaAddress = typeof body.eoaAddress === 'string' ? body.eoaAddress.trim() : ''
    const smartWalletAddress =
      typeof body.smartWalletAddress === 'string' ? body.smartWalletAddress.trim() : undefined
    const waapId = typeof body.waapId === 'string' ? body.waapId.trim() : undefined

    if (!email || !eoaAddress) {
      return NextResponse.json({ error: 'email and eoaAddress are required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { eoaAddress }],
      },
    })

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email,
            eoaAddress,
            smartWalletAddress,
            privyId: waapId || existingUser.privyId,
            registrationCompleted: true,
          },
        })
      : await prisma.user.create({
          data: {
            email,
            eoaAddress,
            smartWalletAddress,
            privyId: waapId,
            registrationCompleted: true,
          },
        })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        eoaAddress: user.eoaAddress,
        smartWalletAddress: user.smartWalletAddress,
      },
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
