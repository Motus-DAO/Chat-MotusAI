import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'

export default function PrivacyPage() {
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
            Privacidad
          </GradientText>
          <p className="mb-8 text-sm text-muted-foreground">
            MotusAI Chat · MotusDAO / operador del servicio
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Responsable</h2>
              <p>
                MotusDAO, como operador de MotusAI, es responsable del tratamiento de los datos
                descritos en este aviso. MotusAI está dirigido a personas de 18 años o más. Para
                asuntos de privacidad, contacto y derechos, escribe a{" "}
                <a
                  href="mailto:contact@motusdao.org"
                  className="text-mauve-400 underline hover:text-mauve-300"
                >
                  contact@motusdao.org
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Material clínico disociado</h2>
              <p>
                MotusAI está pensado únicamente para material clínico previamente disociado. No envíes
                nombres, teléfonos, emails, direcciones, documentos, fechas precisas ni otra
                información que identifique a pacientes o terceros. Eres responsable de revisar y
                disociar el material antes de enviarlo; el producto no filtra automáticamente
                identificadores.
              </p>
              <p className="mt-2">
                El checkbox previo al chat es una confirmación del usuario; no anonimiza ni detecta
                datos automáticamente.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Categorías de datos y finalidades</h2>
              <p>
                Según las funciones que uses, tratamos: (a) datos de cuenta, como
                email, identificador de WaaP y direcciones de wallet; (b) texto que envías al chat,
                historial local y salidas generadas; (c) metadatos técnicos y operativos, como modo,
                latencia, nivel de riesgo y errores; (d) preferencias almacenadas en el navegador; y
                (e) datos públicos de una transacción de certificado, si decides reclamarla.
              </p>
              <p className="mt-2">
                Usamos estos datos para autenticar acceso, prestar el chat, generar respuestas,
                proteger el servicio, prevenir abuso, atender incidencias y emitir el certificado
                opcional. No usamos chats o viñetas clínicas para entrenamiento, fine-tuning ni mejora
                de modelos.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. Inferencia, RAG y proveedores</h2>
              <p>
                Para producir una respuesta, el mensaje y una parte del historial se procesan en
                nuestros servidores y se envían a Venice AI. Si la búsqueda de conocimiento está
                habilitada, la consulta se convierte en un embedding y se consulta en Supabase; el
                proveedor de embeddings configurado puede ser Venice AI u OpenAI.
              </p>
              <p className="mt-2">
                El acceso usa Human.tech/WaaP y puede usar WalletConnect/Reown para wallets externas.
                El producto usa una base de datos PostgreSQL configurada por el operador y proveedores
                de hosting/logs para operar el servicio. Si reclamas un certificado, la transacción se
                registra en la red pública de Celo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Almacenamiento local, telemetría y blockchain</h2>
              <p>
                Los hilos de chat no se persisten en el backend de MotusAI: se guardan en
                localStorage de tu navegador. Borrar los datos del sitio elimina esa copia local, pero
                no revierte el procesamiento técnico ya realizado para generar una respuesta. No uses
                el producto como historial clínico oficial.
              </p>
              <p className="mt-2">
                El servicio genera telemetría operativa, como rendimiento, modo, uso de RAG, nivel de
                riesgo y errores. Si reclamas un certificado, tu wallet y datos de transacción quedan
                asociados a un registro público de Celo, que no puede eliminarse como un registro
                local.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">6. Seguridad y conservación</h2>
              <p>
                Aplicamos medidas razonables para operar el servicio y restringir el acceso técnico.
                Conservamos los datos de cuenta, soporte y telemetría solo el tiempo necesario para
                operar, proteger y resolver incidencias del servicio, salvo que una obligación legal
                requiera conservarlos por más tiempo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">7. Derechos y contacto</h2>
              <p>
                Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus
                datos personales, así como otros derechos que reconozca la ley aplicable. Escríbenos a{" "}
                <a
                  href="mailto:contact@motusdao.org"
                  className="text-mauve-400 underline hover:text-mauve-300"
                >
                  contact@motusdao.org
                </a>{" "}
                con tu solicitud.
              </p>
              <p className="mt-2">
                Podemos actualizar este aviso publicando una nueva versión en esta página.
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
            <Link href="/cookies" className="text-mauve-400 hover:text-mauve-300 underline">
              Cookies
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
