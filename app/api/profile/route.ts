import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, nombre, apellido, telefono, fechaNacimiento, ciudad, pais, avatarUrl, bio, language } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
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

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    })
  } catch (error) {
    console.error('Error updating profile:', error)
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
    const { userId, nombre, apellido, telefono, fechaNacimiento, ciudad, pais, avatarUrl, bio, language } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
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

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
