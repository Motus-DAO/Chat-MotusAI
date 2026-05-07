'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWaaP } from '@/lib/contexts/WaaPProvider'

export default function Home() {
  const { authenticated, login, ready } = useWaaP()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/motusai')
    }
  }, [ready, authenticated, router])

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <GlassCard className="w-full p-8 text-center md:p-12">
          <div className="mb-6 flex items-center justify-center">
            <Sparkles className="mr-3 h-8 w-8 text-mauve-500" />
            <GradientText as="h1" className="text-4xl font-bold md:text-6xl">
              MotusAI Chat
            </GradientText>
          </div>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Accede con WaaP (social o wallet) para entrar directo al chat clínico de MotusDAO.
          </p>
          <CTAButton
            size="lg"
            glow
            className="group"
            onClick={() => {
              void login()
            }}
            disabled={!ready}
          >
            {ready ? 'Entrar al chat' : 'Cargando acceso...'}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </CTAButton>
          <p className="mt-4 text-xs text-muted-foreground">
            Tu email y wallet se sincronizan automáticamente al iniciar sesión.
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
