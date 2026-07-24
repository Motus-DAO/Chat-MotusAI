import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const PLACEHOLDER_EMAIL_SUFFIX = '@users.motusdao.local'

function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(PLACEHOLDER_EMAIL_SUFFIX))
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function maybeUpdateUserEmail(userId: string, emailRaw: unknown) {
  if (typeof emailRaw !== 'string') return null
  const email = emailRaw.trim().toLowerCase()
  if (!email) return null
  if (!isValidEmail(email)) {
    throw new Error('EMAIL_INVALID')
  }

  const current = await prisma.user.findUnique({ where: { id: userId } })
  if (!current) throw new Error('USER_NOT_FOUND')

  // Only allow replacing placeholder emails, or keeping the same email.
  if (
    current.email === email ||
    isPlaceholderEmail(current.email) ||
    !current.email
  ) {
    const taken = await prisma.user.findUnique({ where: { email } })
    if (taken && taken.id !== userId) {
      throw new Error('EMAIL_TAKEN')
    }
    return prisma.user.update({
      where: { id: userId },
      data: { email },
    })
  }

  // OAuth-backed email: ignore client attempts to change it.
  return current
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      nombre,
      apellido,
      telefono,
      fechaNacimiento,
      ciudad,
      pais,
      avatarUrl,
      bio,
      language,
      email,
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    let user = null
    try {
      user = await maybeUpdateUserEmail(userId, email)
    } catch (e) {
      if (e instanceof Error && e.message === 'EMAIL_INVALID') {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
      }
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        return NextResponse.json(
          { error: 'Ese email ya está registrado en otra cuenta' },
          { status: 409 },
        )
      }
      throw e
    }

    // Create or update profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        nombre: nombre || '',
        apellido: apellido || '',
        telefono: telefono || '',
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        ciudad: ciudad || '',
        pais: pais || '',
        avatarUrl,
        bio: bio || '',
        language: language || 'es'
      },
      create: {
        userId,
        nombre: nombre || '',
        apellido: apellido || '',
        telefono: telefono || '',
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : new Date('2000-01-01'),
        ciudad: ciudad || '',
        pais: pais || '',
        avatarUrl,
        bio: bio || '',
        language: language || 'es'
      }
    })

    const freshUser =
      user ||
      (await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          eoaAddress: true,
          smartWalletAddress: true,
        },
      }))

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile,
      user: freshUser,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ese email ya está registrado en otra cuenta' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')
    const privyId = searchParams.get('privyId')

    // Find user by userId, email, or privyId.
    // Keep this query resilient for environments where optional
    // profile extension tables (patient/psm) are not yet provisioned.
    let user
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true
        }
      })
    } else if (email || privyId) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            privyId ? { privyId } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        },
        include: {
          profile: true
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: user.profile,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        eoaAddress: user.eoaAddress,
        smartWalletAddress: user.smartWalletAddress,
        registrationCompleted: user.registrationCompleted,
        createdAt: user.createdAt
      },
      patientProfile: null,
      psmProfile: null
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      nombre,
      apellido,
      telefono,
      fechaNacimiento,
      ciudad,
      pais,
      avatarUrl,
      bio,
      language,
      email,
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    let user = null
    try {
      user = await maybeUpdateUserEmail(userId, email)
    } catch (e) {
      if (e instanceof Error && e.message === 'EMAIL_INVALID') {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
      }
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        return NextResponse.json(
          { error: 'Ese email ya está registrado en otra cuenta' },
          { status: 409 },
        )
      }
      throw e
    }

    // Update profile
    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        nombre: nombre || '',
        apellido: apellido || '',
        telefono: telefono || '',
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        ciudad: ciudad || '',
        pais: pais || '',
        avatarUrl,
        bio: bio || '',
        language: language || 'es'
      }
    })

    const freshUser =
      user ||
      (await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          eoaAddress: true,
          smartWalletAddress: true,
        },
      }))

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile,
      user: freshUser,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ese email ya está registrado en otra cuenta' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
