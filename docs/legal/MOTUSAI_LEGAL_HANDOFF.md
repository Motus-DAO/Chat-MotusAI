# MotusAI — handoff legal (MVP / validación de mercado)

**Estado:** activo como mapa de riesgos y backlog, no como gate enterprise  
**Objetivo actual:** validar mercado con un MVP de bajo riesgo.  
**No objetivo:** declarar “compliance completo”, “legalmente cerrado” ni readiness GA/enterprise.

Este documento **conserva** la investigación y los riesgos (`MOTUSAI_LEGAL_RESEARCH.md`, `MOTUSAI_DATA_MAP.md`).  
Su propósito ya **no** es “todo debe resolverse antes de publicar”, sino:

1. Distinguir qué es **bloqueante para el MVP**.  
2. Registrar riesgos y decisiones **importantes pero diferibles**.  
3. Dejar backlog claro para **GA / escala / enterprise**.

## Documentos de evidencia (no gates absolutos)

1. `docs/legal/MOTUSAI_LEGAL_RESEARCH.md` — investigación comparada y fuentes.  
2. `docs/legal/MOTUSAI_DATA_MAP.md` — evidencia técnica, flujos y límites de afirmaciones.  
3. `app/terms/page.tsx` — Términos de uso (MVP).  
4. `app/privacy/page.tsx` — Aviso de Privacidad (MVP).  
5. `app/cookies/page.tsx` — Cookies y almacenamiento (MVP).

---

## A. Bloqueantes para MVP

Solo lo necesario para **vender / pilotear** el MVP sin claims falsos ni captura intencional de PII clínica.

| Ítem | Estado MVP | Notas |
| --- | --- | --- |
| Operador identificable | Cumple a nivel MVP | MotusDAO como operador del servicio en Términos/Privacidad |
| Email de contacto | Cumple | `contact@motusdao.org` |
| Solo adultos | Cumple en copy | Términos: mayor de edad; no hay verificación de edad técnica |
| Prohibición de datos identificables de pacientes | Cumple en copy + UI | Términos, Privacidad, gate de material disociado |
| Material clínico previamente disociado | Cumple | Confirmación de usuario (`motusai.disassociated-material.ack.v2`); no es detección automática |
| No es terapia / diagnóstico / tratamiento / emergencia / supervisión humana | Cumple en copy | Banner `/motusai` + Términos |
| IA puede equivocarse; no sustituye juicio profesional | Cumple | Términos §§2–3 |
| No usar chats/viñetas para entrenamiento por MotusDAO | Cumple como **política del operador** | Afirmar solo lo que MotusDAO controla; la inferencia sigue pasando por proveedores |
| Proveedores técnicos activos documentados | Cumple a nivel MVP | Venice, embeddings (Venice/OpenAI), Supabase RAG, WaaP, WalletConnect/Reown, Postgres/hosting, Celo (certificados opcionales) |
| Términos / privacidad / cookies alineados al comportamiento real | Cumple con matices | Ver “Revisión MVP de páginas” abajo |

**Riesgos MVP que no son “compliance enterprise”, pero sí disciplina de producto:**

- El gate es acuse, no redacción automática.  
- Q&A y otras entradas de texto libre no sustituyen el juicio del usuario sobre disociación.  
- Auth API confía en `x-motus-waap-id` (aceptable para validación; endurecer en GA).  
- Posibles restos de contenido en logs de error del hosting (minimizar; no bloquea piloto cerrado si no se afirma “cero logs”).

---

## B. Importantes pero no bloqueantes para validación

Backlog para madurar **sin frenar** el go-to-market del MVP:

- DPA / contratos formales con todos los subprocesadores.  
- Política formal de retención con plazos numéricos y borrado operativo.  
- SLA y proceso ARCO sofisticado (identidad, plazos, auditoría).  
- Contratos enterprise / uso institucional.  
- Jurisdicciones internacionales adicionales más allá del mercado inicial de validación.  
- Análisis Brasil / LGPD (si/cuando se abra ese mercado).  
- Estructura societaria futura, domicilio fiscal completo, poderes.  
- Política avanzada de respuesta a incidentes.  
- Consentimientos blockchain más sofisticados (hoy: aviso de Celo pública en Términos/Cookies).  
- Revisión jurídica exhaustiva por abogado externo.  
- Aceptación versionada de términos en servidor.  
- Verificación criptográfica de sesión WaaP en servidor.  
- Extender/enforce técnico del gate a toda superficie de texto libre.

---

## C. Futuro / GA / enterprise

Cuando haya clientes de pago a escala, instituciones, datos sensibles a volumen, o expansión regulatoria:

- Abogado aprueba textos por jurisdicción.  
- Roles formales (responsable / encargado) y bases legales documentadas.  
- Inventario de cookies/SDK del despliegue real + transferencias internacionales.  
- Retención/borrado alineados a controles técnicos reales (logs, backups, proveedores).  
- Protocolo de crisis con escalamiento humano si se promete.  
- Hardening de auth, telemetría sin contenido clínico, rate limits distribuidos.  
- Claims regulatorios (dispositivo médico, HIPAA, etc.) — **solo si el producto y el counsel lo sostienen**.

---

## Declaraciones MVP (copy permitido)

Seguras para validación comercial **si** coinciden con el producto desplegado:

- No reemplaza juicio clínico, supervisión humana, terapia, diagnóstico, tratamiento ni emergencia.  
- El usuario es responsable de disociar viñetas y de no enviar identificadores.  
- El contenido se procesa para inferencia vía proveedores técnicos listados.  
- MotusDAO **no** usa chats/viñetas para entrenamiento/fine-tuning/mejora de modelos propios.  
- Los hilos viven en el navegador; borrar datos del sitio no revierte inferencia ya hecha ni registros on-chain.  
- Certificados opcionales = transacción pública en Celo ligada a wallet, sin el texto del chat.

Evitar en MVP: “compliance total”, “anonimización garantizada”, “cero retención en proveedores”, “HIPAA/GDPR certified”, “dispositivo médico”.

---

## Criterio de salida — MVP

MotusAI puede **venderse / probarse** como MVP cuando:

1. Las páginas legales coinciden con la implementación real.  
2. No se piden ni almacenan **intencionalmente** datos identificables de pacientes.  
3. El usuario confirma que usa material disociado.  
4. No hay entrenamiento con chats por parte de MotusDAO.  
5. Están claros los límites clínicos (no terapia / diagnóstico / emergencia / supervisión humana).  
6. Están identificados los proveedores reales.  
7. Hay contacto y responsable operativo identificable.  
8. No se hacen claims regulatorios o clínicos que el producto no pueda sostener.

**Cláusula explícita:**

> El cumplimiento jurídico completo, contratos avanzados con proveedores, expansión jurisdiccional y revisión legal especializada forman parte del proceso de maduración del producto y **no constituyen por sí mismos un bloqueo** para validar este MVP, siempre que se respeten los límites definidos arriba.

Distinción de etapas:

| Etapa | Qué implica |
| --- | --- |
| **Validación MVP** | Piloto / venta temprana con copy honesto y límites clínicos; riesgos B/C en backlog |
| **Disponibilidad general (GA)** | Criterio GA abajo |
| **Enterprise / institucional** | Contratos, DPA, retención, ARCO formal, counsel |

---

## Criterio de salida — GA / escala

Antes de presentarse como producto general / institucional maduro:

1. Resolver ítems de la sección B relevantes al mercado GA.  
2. Revisión legal especializada de Términos/Privacidad para las jurisdicciones activas.  
3. Confirmar en producción: modelo Venice, modo de privacidad, embeddings, logging y retención.  
4. Contratos/DPA con subprocesadores materiales.  
5. Proceso ARCO operativo y política de incidentes.  
6. Endurecer auth servidor y minimizar contenido clínico en logs.  
7. No afirmar compliance normativo total sin evidencia.

La investigación previa y la lista antigua de “bloquea publicación” viven aquí como **backlog de maduración**, no como veto del MVP.

---

## Revisión MVP de páginas (sep 2026)

Chequeo rápido contra implementación:

| Afirmación en páginas | ¿Coincide? | Acción |
| --- | --- | --- |
| Operador MotusDAO + `contact@motusdao.org` | Sí | — |
| Adultos / juicio profesional / no terapia-dx-urgencia | Sí | — |
| Material disociado + checkbox = confirmación, no detección | Sí | — |
| No entrenamiento por MotusDAO | Sí (política operador) | No afirmar política interna de Venice sin contrato |
| Hilos en `localStorage`, no backend de hilos | Sí | — |
| Proveedores: Venice, embeddings, Supabase, WaaP, WC, Postgres/hosting, Celo | Sí | — |
| Clave ack `motusai.disassociated-material.ack.v2` | Sí en Cookies | Data map actualizado si aún decía v1 |
| “Solo acepta” material disociado | Matiz | Copy ajustado a obligación del usuario (no filtro técnico) |

---

## Correcciones técnicas (backlog; no gate MVP)

Útiles para GA; opcionales para piloto cerrado:

1. No registrar contenido clínico en logs de error.  
2. Verificar identidad WaaP en servidor.  
3. Aceptación versionada de términos en servidor.  
4. Retención/borrado operativos documentados.  
5. Gate o disclaimer explícito en Q&A si se mantiene el toggle.
