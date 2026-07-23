import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function clientFacingSyncError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const lower = raw.toLowerCase()

  if (
    lower.includes('enotfound') ||
    lower.includes('tenant/user') ||
    lower.includes('can\'t reach database') ||
    lower.includes('p1001') ||
    lower.includes('p1017') ||
    lower.includes('connection') ||
    lower.includes('timeout')
  ) {
    return {
      status: 503,
      message:
        'No se pudo conectar a la base de datos de la app. Revisa DATABASE_URL / DIRECT_URL (proyecto Supabase pausado, eliminado o credenciales inválidas).',
    }
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return {
      status: 409,
      message:
        'Conflicto de identidad (email/wallet ya registrados). Cierra sesión e inicia de nuevo, o limpia el usuario duplicado en la DB.',
    }
  }

  return { status: 500, message: 'Internal server error' }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eoaAddress = typeof body.eoaAddress === 'string' ? body.eoaAddress.trim() : ''
    const smartWalletAddress =
      typeof body.smartWalletAddress === 'string' ? body.smartWalletAddress.trim() : undefined
    const waapId = typeof body.waapId === 'string' ? body.waapId.trim() : undefined
    let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!eoaAddress) {
      return NextResponse.json({ error: 'eoaAddress is required' }, { status: 400 })
    }

    // Google/social WaaP sessions sometimes omit email until requestEmail() succeeds.
    // Keep sync working with a stable placeholder derived from wallet/WaaP id.
    if (!email) {
      const suffix = (waapId || eoaAddress).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase()
      email = `waap_${suffix || 'user'}@users.motusdao.local`
    }

    const [byPrivyId, byEmail, byEoa] = await Promise.all([
      waapId
        ? prisma.user.findUnique({
            where: { privyId: waapId },
          })
        : Promise.resolve(null),
      prisma.user.findUnique({
        where: { email },
      }),
      prisma.user.findUnique({
        where: { eoaAddress },
      }),
    ])

    // If WaaP id and EOA resolve to different rows, prefer WaaP id and
    // avoid unique collisions by not forcing the other row's eoa onto this one
    // when it already belongs elsewhere.
    let targetUser = byPrivyId || byEmail || byEoa

    if (byPrivyId && byEoa && byPrivyId.id !== byEoa.id) {
      console.warn('[sync-user] Conflicting users for waapId vs eoaAddress', {
        waapUserId: byPrivyId.id,
        eoaUserId: byEoa.id,
      })
      targetUser = byPrivyId
    }

    const nextEmail =
      email.includes('@users.motusdao.local') && targetUser?.email
        ? targetUser.email
        : email

    // When merging onto waap user but eoa is taken by another row, keep existing eoa
    // on the target unless it's free / already ours.
    const eoaTakenByOther = Boolean(byEoa && targetUser && byEoa.id !== targetUser.id)
    const nextEoa = eoaTakenByOther ? targetUser!.eoaAddress : eoaAddress

    const user = targetUser
      ? await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            email: nextEmail,
            eoaAddress: nextEoa,
            smartWalletAddress,
            privyId: waapId || targetUser.privyId,
            registrationCompleted: true,
          },
        })
      : await prisma.user.create({
          data: {
            email: nextEmail,
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
    const { status, message } = clientFacingSyncError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
