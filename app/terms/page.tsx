import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'

export default function TermsPage() {
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
            Términos de uso
          </GradientText>
          <p className="mb-8 text-sm text-muted-foreground">
            MotusAI Chat · MotusDAO / operador del servicio
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Servicio</h2>
              <p>
                MotusAI es un servicio de MotusDAO para apoyo reflexivo y educativo en revisión de
                casos, razonamiento clínico y análisis estructurado. Estos términos regulan el uso del
                servicio junto con el Aviso de Privacidad y Cookies y almacenamiento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Qué es MotusAI</h2>
              <p>
                MotusAI está dirigido a profesionales y estudiantes adultos (18 años o más). Sus
                respuestas son generadas por IA y son probabilísticas: pueden ser inexactas,
                incompletas o inapropiadas para un caso concreto y deben revisarse antes de usarse.
              </p>
              <p className="mt-2">
                MotusAI{' '}
                <strong className="text-foreground">
                  no es psicoterapia, diagnóstico, tratamiento, prescripción, dispositivo médico,
                  servicio de emergencia ni sustituto de supervisión humana
                </strong>
                . Sus salidas pueden equivocarse. No debe utilizarse como única base para una
                decisión clínica, profesional o de seguridad.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Uso permitido y responsabilidad profesional</h2>
              <p>
                El producto está pensado para reflexión y aprendizaje. Cada persona
                usuaria conserva la responsabilidad de ejercer su propio juicio, revisar críticamente
                toda salida antes de usarla y cumplir los deberes profesionales, de confidencialidad,
                consentimiento, expediente y secreto aplicables a su práctica.
              </p>
              <p className="mt-2">
                Debes tener al menos 18 años para usar MotusAI. No lo uses para sustituir los
                protocolos de tu institución, tu expediente clínico oficial ni las obligaciones de tu
                práctica.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. Material clínico y contenido de usuario</h2>
              <p>
                Solo puedes compartir material clínico previamente disociado. No introduzcas nombres,
                teléfonos, emails, direcciones, documentos, fechas precisas, datos de contacto ni otra
                información que identifique directa o indirectamente a un paciente o tercero.
              </p>
              <p className="mt-2">
                El checkbox previo al chat es una confirmación tuya: no anonimiza ni detecta datos
                automáticamente. Eres responsable de revisar el material antes de enviarlo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Crisis y situaciones urgentes</h2>
              <p>
                MotusAI no monitorea en tiempo real, no contacta servicios de emergencia ni garantiza
                una intervención humana. Ante riesgo de daño, crisis, abuso, urgencia médica o
                psiquiátrica, contacte de inmediato los servicios de emergencia o recursos de crisis
                locales y siga los protocolos profesionales aplicables.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">6. Datos, IA y contenido</h2>
              <p>
                Para generar respuestas, el contenido enviado se procesa mediante proveedores técnicos
                descritos en el Aviso de Privacidad. MotusDAO no utiliza chats o viñetas clínicas para
                entrenamiento, fine-tuning ni mejora de modelos.
              </p>
              <p className="mt-2">
                Conservas los derechos que tengas sobre tu contenido. Nos otorgas únicamente la licencia
                limitada necesaria para recibirlo, procesarlo y generar la respuesta solicitada.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">7. Cuenta, uso indebido y disponibilidad</h2>
              <p>
                Debes proporcionar datos de acceso válidos y no interferir, eludir límites de uso,
                introducir contenido ilícito o utilizar el servicio para identificar personas. Podemos
                suspender el acceso ante uso indebido o para proteger el servicio. MotusAI es un MVP
                experimental y su disponibilidad o funciones pueden cambiar.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">8. Certificados opcionales</h2>
              <p>
                Si eliges reclamar un certificado de asistencia, la transacción se registra en la red
                pública de Celo y puede quedar asociada a tu wallet. El contenido del chat no se
                incorpora a esa transacción.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">9. Contacto y cambios</h2>
              <p>
                Para consultas sobre MotusAI o estos términos, escribe a{" "}
                <a
                  href="mailto:contact@motusdao.org"
                  className="text-mauve-400 underline hover:text-mauve-300"
                >
                  contact@motusdao.org
                </a>
                . Podemos actualizar estos términos al publicar una nueva versión en esta página.
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
            <Link href="/privacy" className="text-mauve-400 hover:text-mauve-300 underline">
              Privacidad
            </Link>
            <Link href="/cookies" className="text-mauve-400 hover:text-mauve-300 underline">
              Cookies
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
