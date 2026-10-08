import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'

export default function CookiesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 md:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(147, 51, 234, 0.22) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(236, 72, 153, 0.14) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 mx-auto max-w-3xl">
        <GlassCard className="w-full p-8 md:p-12">
          <GradientText as="h1" className="mb-2 text-3xl font-bold md:text-4xl">
            Cookies y almacenamiento
          </GradientText>
          <p className="mb-8 text-sm text-muted-foreground">
            MotusAI Chat · MotusDAO / operador del servicio
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Cookies esenciales</h2>
              <p>
                El sitio puede usar cookies de sesión de Supabase para el funcionamiento y
                autenticación del hub. No identificamos cookies de publicidad o marketing en el código
                actual de MotusAI.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Almacenamiento del navegador</h2>
              <p>
                MotusAI usa localStorage para guardar hilos de chat, preferencias y el acuse de
                material disociado. Las claves de MotusAI incluyen
                <code> motusai.thread.v1:...</code> y
                <code> motusai.disassociated-material.ack.v2</code>. El sitio también usa
                <code> motusdao-ui-storage</code>, <code> waap_user</code> y, si reclamas un
                certificado, <code> motus.certificates.v1:...</code>.
              </p>
              <p className="mt-2">
                WaaP y, cuando conectas una wallet externa, WalletConnect/Reown pueden usar
                localStorage o sessionStorage para su propia sesión. El contenido enviado al chat no
                se guarda en esas cookies, pero se transmite al backend para generar una respuesta.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Telemetría operativa</h2>
              <p>
                MotusAI registra telemetría operativa en el servidor, como rendimiento, modo, uso de
                RAG, nivel de riesgo y errores. No detectamos una herramienta de analítica o marketing
                de terceros en el código actual del chat.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. Blockchain y certificados opcionales</h2>
              <p>
                Si reclamas un certificado de asistencia, la transacción asociada a tu wallet se
                registra en la red pública de Celo. No es una cookie ni almacenamiento local y no puede
                borrarse como los datos del navegador. El flujo actual no incorpora el contenido del
                chat a la transacción.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Cómo borrar y contacto</h2>
              <p>
                Puede borrar cookies y datos del sitio desde la configuración del navegador. Al
                hacerlo, perderá hilos locales, preferencias y acuses guardados. Esto no elimina los
                datos de una transacción ya registrada en Celo.
              </p>
              <p className="mt-2">
                Para dudas sobre almacenamiento o privacidad, escribe a{" "}
                <a
                  href="mailto:contact@motusdao.org"
                  className="text-mauve-400 underline hover:text-mauve-300"
                >
                  contact@motusdao.org
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm">
            <Link href="/" className="text-mauve-400 hover:text-mauve-300 underline">
              Inicio
            </Link>
            <Link href="/motusai" className="text-mauve-400 hover:text-mauve-300 underline">
              MotusAI
            </Link>
            <Link href="/terms" className="text-mauve-400 hover:text-mauve-300 underline">
              Términos
            </Link>
            <Link href="/privacy" className="text-mauve-400 hover:text-mauve-300 underline">
              Privacidad
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
