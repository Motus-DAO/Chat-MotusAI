# Investigación legal y de políticas — MotusAI

**Estado:** borrador de investigación para revisión jurídica  
**Fecha de consulta:** 25 de septiembre de 2026  
**Alcance:** piloto LATAM; México como referencia operativa y Brasil como contraste regional.  
**No es asesoría jurídica, dictamen, ni autorización para publicar los textos legales.**

## 1. Producto y conclusión de riesgo

MotusAI es una herramienta de apoyo reflexivo para supervisión lacaniana y análisis ético-lógico dirigida a profesionales y estudiantes. No debe presentarse como psicoterapia, diagnóstico, tratamiento, dispositivo médico ni servicio de emergencia.

La instrucción de no introducir información identificable es necesaria, pero no elimina el riesgo: una viñeta clínica puede contener datos de salud o permitir reidentificación. Mientras una persona sea identificable directa o indirectamente, el material puede ser dato sensible. La política debe describir el tratamiento real, no asumir que la interfaz consigue anonimización.

**Bloqueador de publicación:** MotusDAO aún no identifica una entidad jurídica ni domicilio como responsable. El aviso integral mexicano no puede quedar completo hasta definirlos.

## 2. Evidencia técnica del tratamiento

| Objeto | Tratamiento confirmado por código | Destinatario o ubicación | Implicación para la política |
| --- | --- | --- | --- |
| Mensaje e historial | Cada turno envía el mensaje y hasta 48 mensajes previos para generar respuesta. | Servidor Next.js y Venice AI. | Informar contenido, finalidad de inferencia, transferencia y retención contractual del proveedor. |
| Consulta RAG | Cuando RAG está habilitado, se genera embedding de la consulta y se consulta el corpus. | Venice u OpenAI, según configuración; Supabase. | Informar proveedor de embeddings y búsqueda vectorial; no describir Supabase como mero almacenamiento local. |
| Hilos | Mensajes, niveles de riesgo y campos lógicos se guardan por usuario y modo. | `localStorage` del navegador. | Explicar que borrar datos del sitio elimina la copia local, pero no mensajes ya procesados ni logs. |
| Identidad y cuenta | WaaP puede facilitar email y wallet; el hub sincroniza datos de perfil a Postgres. | Human.tech/WaaP, WalletConnect/Reown y Postgres. | Enumerar categorías de cuenta y proveedores de autenticación. |
| Telemetría | Registra modo, latencia, hits RAG, riesgo, error y `authSubject`; sale en logs estructurados. | Memoria del proceso y proveedor de hosting/logs. | Informar metadatos, finalidad operativa, retención y acceso; evitar registrar contenido clínico. |
| Errores de parseo | El servidor registra un prefijo de hasta 800 caracteres de respuesta del modelo. | Logs del servidor/hosting. | Brecha: puede exponer material clínico derivado; eliminar o redactar antes de producción. |
| Certificado opcional | Minta asistencia con wallet y `sessionId`; la cadena es pública e inmutable. | Celo. | Informar claramente el carácter público y la imposibilidad práctica de borrar datos on-chain. |

### Archivos de evidencia

- `app/api/motusai/route.ts`: inferencia Venice, historial, RAG, SSE y logging de errores.
- `lib/motus-knowledge.ts` y `lib/ai-client.ts`: embeddings y búsqueda vectorial Supabase.
- `lib/motusai-thread-storage.ts`: estructura y claves de hilos locales.
- `lib/motusai-telemetry.ts`: telemetría y logging estructurado.
- `lib/motusai-auth.ts` y `lib/contexts/WaaPProvider.tsx`: identidad WaaP y autenticación.
- `app/api/certificados/claim/route.ts`: certificado Celo.

## 3. Brechas entre política actual y funcionamiento

1. Privacidad enfatiza `localStorage`, pero los mensajes e historial también se procesan en servidor y se transmiten a Venice.
2. Faltan destinatarios potenciales: proveedor de embeddings, Supabase, Human.tech/WaaP, WalletConnect/Reown, hosting/logs y Celo cuando se reclama un certificado.
3. El checklist de anonimización es un acuse de interfaz, no redacción, detección ni anonimización automática; solo se aplica al modo de supervisión, no al Q&A.
4. La telemetría contiene un identificador de sujeto y los errores pueden registrar una porción de salida clínica.
5. El identificador recibido en `x-motus-waap-id` no se verifica criptográficamente en servidor. No debe afirmarse que existe autenticación robusta de usuario hasta corregirlo.
6. Cookies/almacenamiento no inventaria `motusdao-ui-storage`, `waap_user`, hilos MotusAI, certificados locales, cookies Supabase ni artefactos del SDK de wallet.
7. Los certificados blockchain no exponen el contenido del chat en el código revisado, pero exponen wallet y sesión en un registro público.

## 4. Patrones comparados basados en fuentes oficiales

| Referente | Evidencia relevante | Patrón útil | Precaución |
| --- | --- | --- | --- |
| OpenAI | Términos: el usuario garantiza permisos sobre el input; controles de uso de contenido y eliminación. | Separar la autorización técnica para prestar el servicio del uso para mejora/entrenamiento. | Su modelo de consumo y límites de responsabilidad no se trasladan automáticamente a LATAM ni a salud mental. |
| Anthropic | Términos y privacidad distinguen controles de entrenamiento, feedback y borrado. | Si en el futuro se desea reutilizar viñetas, exigir opt-in separado, específico y revocable. | No usar por defecto contenido clínico para entrenamiento ni aun cuando se alegue desidentificación. |
| Wysa | Exclusión explícita de crisis, no consejo/diagnóstico médico, advertencia de no compartir PII y controles de datos. | Repetir límites de crisis en producto, términos y flujo de riesgo; separar analítica agregada de conversación. | Wysa opera bajo su propio modelo institucional y regulatorio. |
| Heidi Health | Juicio clínico y verificación final siguen siendo responsabilidad del profesional; limita uso de datos sensibles en entrenamiento. | Establecer revisión humana obligatoria y prohibir depender de la salida como única base clínica. | No afirmar cumplimiento HIPAA/GDPR ni usar sus contratos sin evaluación propia. |
| SimplePractice | Distingue los roles del profesional, paciente y plataforma; el profesional conserva responsabilidad por atención. | Definir si MotusAI es proveedor independiente, encargado o ambos, según el caso de uso. | La asignación de roles requiere abogado y contrato con organizaciones. |

## 5. Marco legal de referencia

### México

La [LFPDPPP](https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo125102.html) considera sensibles, entre otros, los datos de salud. Para estos exige consentimiento expreso y por escrito cuando aplique (art. 8). El aviso de privacidad debe indicar, al menos, identidad y domicilio del responsable, datos tratados y cuáles son sensibles, finalidades, medios para limitar uso/divulgación, mecanismos ARCO y proceso de cambios (art. 15).

**Implicación:** sin entidad, domicilio, mecanismo ARCO y descripción real de datos/proveedores, el aviso no está listo para publicación.

### Brasil

La [LGPD](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) clasifica la información de salud como dato personal sensible y exige consentimiento específico y destacado para finalidades específicas cuando esa sea la base elegida (art. 11).

**Implicación:** si se ofrece el producto en Brasil, no basta una aceptación general de términos; se debe definir con abogado la base legal, transparencia, transferencias y derechos aplicables.

## 6. Requisitos de los documentos

### Términos de uso

- Elegibilidad: profesionales y estudiantes; edad mínima y restricciones para menores por definir.
- Producto de apoyo reflexivo, no atención clínica, diagnóstico, tratamiento, prescripción ni respuesta de emergencia.
- El profesional conserva juicio clínico, confidencialidad, deberes de consentimiento y responsabilidad de revisar cada salida antes de usarla.
- Prohibición de ingresar PII/PHI de pacientes o terceros sin la autorización y base legal aplicables; obligación de anonimizar y no intentar reidentificar.
- Naturaleza probabilística y posibilidad de resultados erróneos, incompletos o inapropiados.
- Reglas para crisis, suspensión, abuso, propiedad/licencia mínima del contenido y cambios de servicio.
- Ley aplicable, foro, entidad y contacto deben quedar pendientes de abogado.

### Aviso de privacidad

- Responsable, domicilio y canal ARCO/privacidad.
- Categorías: cuenta, wallet, correo, chat/viñeta, metadatos técnicos, logs, datos locales y datos on-chain.
- Finalidades necesarias versus opcionales; nunca confundir el servicio con entrenamiento/mejora.
- Subprocesadores/terceros, transferencias internacionales, seguridad y retención por objeto.
- Derechos de acceso, rectificación, cancelación y oposición, más cómo actuar cuando MotusAI no puede identificar al paciente descrito en una viñeta.
- Explicar que el contenido clínico no se usa para entrenar modelos de MotusAI salvo consentimiento adicional, específico, verificable y aprobado legalmente.

### Cookies y almacenamiento

- Separar cookies de `localStorage`, `sessionStorage` y registros on-chain.
- Enumerar solo tecnologías comprobadas y su propósito.
- Mantener analítica/marketing fuera de datos de chat y datos clínicos.
- Implementar gestor de consentimiento antes de añadir tecnologías no esenciales en jurisdicciones que lo requieran.

## 7. Backlog para abogado y producto (no bloquea MVP)

Ítems para maduración GA/enterprise. **No** son veto de validación comercial del MVP si se cumplen los límites del handoff MVP (`MOTUSAI_LEGAL_HANDOFF.md`).

1. Entidad legal, domicilio, países realmente disponibles, ley aplicable y canal de contacto/ARCO.
2. Clasificación de MotusAI y de cada usuario profesional: responsable, encargado o proveedor independiente.
3. Condiciones de uso por estudiantes (edad mínima MVP: 18+).
4. Proveedor, modelo y modo de privacidad Venice efectivamente desplegado; contrato/DPA, retención y ubicación.
5. Proveedores de autenticación, hosting, base de datos, RAG, embeddings y cadena, con sus ubicaciones y contratos.
6. Retención de chats, logs, backups, cuenta y datos de certificados; mecanismos operativos de eliminación.
7. Si habrá entrenamiento, evaluación o mejora con datos de usuarios: no activar sin consentimiento granular y aprobación jurídica.
8. Alcance del flujo de crisis y recursos locales; si la detección de riesgo genera proceso humano adicional.

## 8. Prerrequisitos técnicos de GA (backlog)

- Eliminar o redactar contenido clínico de logs, especialmente el prefijo de salida ante fallos.
- Sustituir el encabezado de identidad confiado por autenticación de servidor verificable.
- Aplicar el gate de material sensible a toda superficie que acepte texto libre o declarar que Q&A no admite casos clínicos.
- Registrar aceptación versionada de Términos, Privacidad, Cookies y acuse de material disociado.
- Verificar el inventario real de cookies/SDKs en el despliegue productivo antes de GA.

## 9. Fuentes primarias de benchmarking

- [OpenAI Terms](https://openai.com/policies/row-terms-of-use/), [Privacy](https://openai.com/policies/row-privacy-policy/) y [uso de datos](https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/).
- [Anthropic Consumer Terms](https://www.anthropic.com/legal/consumer-terms), [Privacy](https://www.anthropic.com/legal/privacy) y [Cookies](https://www.anthropic.com/legal/cookies).
- [Wysa Terms](https://legal.wysa.io/terms), [Privacy](https://legal.wysa.io/privacy-policy) y [Cookies](https://www.wysa.com/cookie-policy).
- [Heidi Health Privacy](https://www.heidihealth.com/legal/privacy-policy) y [Scribe Usage Policy](https://www.heidihealth.com/legal/scribe-usage-policy).
- [SimplePractice Terms](https://www.simplepractice.com/terms/) y [Privacy](https://www.simplepractice.com/privacy/).
- [Venice Privacy](https://venice.ai/legal/privacy-policy), [Terms](https://venice.ai/legal/tos) y [privacy documentation](https://docs.venice.ai/overview/privacy).
