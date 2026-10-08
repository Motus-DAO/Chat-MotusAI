# SDD — MotusAI: Supervisión lacaniana × Lógicamente matemática

**Status:** Active  
**Product:** ChatAlphaMotusDAO / MotusAI Chat  
**Date:** 2026-09-24  
**Owners (product/eng):** Agent + MotusDAO eng  
**Owners (clínica — humanos):** Tú (psicólogo) + socio (Mtro. en psicoterapia, autor del skill)

---

## 1. Problem / goal

Empaquetar el chat actual (ya orientado por `prompts/motusai-skill.md`) como producto vendible/usable con **dos superficies claras**:

1. **Supervisión lacaniana** — apoyo reflexivo a casos para PSM (demanda, significantes, transferencia, corte).  
2. **Lógicamente matemática** — hacer visible el dispositivo formal (cuadrante, modalidades, contradicción) sin cerrar diagnóstico.

**No-goals (fuera de este SDD):** matching psicoterapia, academia completa, wallet como valor clínico, certificación lacaniana oficial, dispositivo médico regulado.

---

## 2. Current baseline (ya existe)

| Capacidad | Estado |
|-----------|--------|
| Skill ético-lógico lacaniano | `prompts/motusai-skill.md` |
| Modos `supervision` / `qa` | UI + API |
| JSON clínico (demanda, significantes, `logical_position`, riesgo, notas) | API parsea y envía en SSE `done` |
| Banner disclaimer en `/motusai` | Parcial |
| Alerta riesgo + recursos LATAM + mailto humano | Parcial |
| Persistencia local de hilos | Parcial (no guarda campos lógicos) |
| Gate por rol PSM | Soft (notas solo si `isPsm`; modo supervisión abierto a todos) |
| Landing de producto dual | No |
| Páginas `/terms` `/privacy` `/cookies` | Enlaces rotos (middleware las marca públicas) |
| Panel UI del cuadrante | No (solo `clinical_notes` en details) |
| Checklist de anonimización | Solo copy al pie; no gate UX |

---

## 3. Product definition

### 3.1 Un producto, dos modos clínicos + un modo Q&A

| Modo UI | Job | Output |
|---------|-----|--------|
| **Supervisión lacaniana** | Reflexión de caso / supervisión asistida | Pregunta analítica + panel (demanda, significante, notas) |
| **Lógica matemática** *(vista del mismo turn clínico)* | Formalizar el discurso | Panel cuadrante (`logical_position`, patrón, modalidades) |
| **Preguntas MotusDAO** | Producto/ecosistema | Prosa + RAG (sin JSON clínico) |

**Decisión de diseño:** no crear una tercera pestaña “lógica”. El modo supervisión **siempre** muestra el panel lógico; el branding del producto nombra ambas dimensiones. La pestaña Q&A queda separada para no contaminar la marca clínica.

### 3.2 Positioning (copy canónico — borrador eng)

> MotusAI es un **asistente de verificación de casos** orientado a supervisión lacaniana y análisis ético-lógico. **No** sustituye supervisión humana, psicoterapia, diagnóstico ni emergencia.

*(Copy final = pendiente humano clínico — ver §8.)*

---

## 4. Architecture (delta)

```text
Landing (/)
  └─ claims: Supervisión lacaniana · Lógicamente matemática
       │
/motusai
  ├─ Banner disclaimer + link Términos (borrador)
  ├─ Tabs: Supervisión lacaniana | Preguntas MotusDAO
  ├─ Soft gate PSM + checklist anonimización (1ª sesión)
  └─ Chat
       ├─ response (prosa)
       ├─ LogicalQuadrantPanel  ← NUEVO (campos del JSON)
       ├─ clinical_notes (PSM)
       └─ risk banner + handoff humano
```

**API:** sin cambio de schema; sí propagar campos ya parseados al cliente y persistirlos.

**Nuevos módulos eng:**

- `components/motusai/LogicalQuadrantPanel.tsx`
- `components/motusai/AnonymizationGate.tsx`
- `lib/motusai-quadrant.ts` — labels humanos para `∀x φx`, etc.
- `app/terms|privacy|cookies/page.tsx` — stubs DRAFT

---

## 5. Slices

### Slice 1 — Surface & trust UX  
**Owner:** eng  
**AC:**

1. Tabs/copy: “Supervisión lacaniana” + subtítulo que nombre la capa lógica.  
2. Banner disclaimer reforzado + links a `/terms` y `/privacy`.  
3. Checklist de anonimización (localStorage ack) antes del primer envío en modo supervisión.  
4. Soft gate: si rol ≠ `psm`, aviso “pensado para PSM”; permite continuar con ack (piloto).  
5. Home + footer alineados al positioning.

### Slice 2 — Panel lógicamente matemático  
**Owner:** eng  
**AC:**

1. Cliente recibe y persiste: `detected_demand`, `primary_signifier`, `secondary_signifier`, `logical_position`, `observed_pattern`.  
2. UI panel colapsable por mensaje assistant (supervisión).  
3. Labels legibles del cuadrante (Necessary/Possible/Contingent/Impossible) mapeados desde la fórmula.  
4. Q&A no muestra el panel.

### Slice 3 — Riesgo / handoff (pulido)  
**Owner:** eng  
**AC:**

1. Mantener banner high/emergency + recursos LATAM.  
2. CTA “Hablar con humano” claro; copy de no-autonomía en crisis.  
3. (Opcional) telemetría ya existente registra `riskLevel`.

### Slice 4 — Legal stubs (eng) + revisión (humano)  
**Owner eng:** páginas legales MVP alineadas al comportamiento real.  
**Owner humano:** maduración GA/counsel en backlog (no veto MVP).  
**AC eng:**

1. `/terms`, `/privacy`, `/cookies` existen y no 404.  
2. Copy MVP sin banner BORRADOR; alineado a implementación.  
3. Middleware ya las trata como públicas.

### Slice 5 — Piloto clínico (humano)  
**Owner:** tú + socio  
**AC (humano):** ver §8. Eng solo deja checklist en este SDD.

---

## 6. Out of scope / deferred (eng)

- Hard-gate API por rol PSM (requiere auth de rol server-side fiable).  
- Memoria clínica server-side opt-in.  
- Pricing / paywall.  
- Corpus RAG clínico aparte del knowledge Motus.  
- Separar modelo o temperatura por “vista lógica” vs prosa (mismo turn).

---

## 7. Implementation status

| Slice | Status |
|-------|--------|
| SDD (este doc) | Done |
| Slice 1 — Surface & trust | Done (eng) |
| Slice 2 — Quadrant panel | Done (eng) |
| Slice 3 — Risk polish | Done (eng; baseline ya cubría lo esencial) |
| Slice 4 — Legal stubs | Done (DRAFT eng) / **Pending human legal** |
| Slice 5 — Clinical pilot | **Pending human only** |

### Archivos eng tocados (corte 2026-09-24)

- `docs/SDD_SUPERVISION_LACANIANA_LOGICAMENTE_MATEMATICA.md` (este)
- `docs/HUMAN_PENDING_CLINICAL_LEGAL.md` — checklist humana corta
- `app/page.tsx`, `app/motusai/page.tsx`
- `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/cookies/page.tsx`
- `middleware.ts` (`/cookies` público)
- `components/layout/Footer.tsx`
- `components/ui/animated-ai-chat.tsx` — branding, gate, panel
- `components/motusai/LogicalQuadrantPanel.tsx`
- `components/motusai/AnonymizationGate.tsx`
- `lib/motusai-quadrant.ts`, `lib/motusai-anon-ack.ts`, `lib/motusai-thread-storage.ts`

Checklist humana operativa: [`HUMAN_PENDING_CLINICAL_LEGAL.md`](./HUMAN_PENDING_CLINICAL_LEGAL.md)

---

## 8. Pendientes SOLO humanos

Checklist para ustedes dos (psicólogo + Mtro. psicoterapia). Eng no cierra estos ítems.

### 8.1 Skill / clínica
- [ ] Revisión conjunta de `prompts/motusai-skill.md` (tono, ejemplos, reglas de corte).  
- [ ] Aprobar wording de positioning: “inspirado en lacaniano” vs claims más fuertes.  
- [ ] Validar mapeo del cuadrante (¿las 4 fórmulas del skill son las que quieren enseñar en UI?).  
- [ ] Curar 5–10 casos anónimos de golden set (buenas/malas respuestas).  
- [ ] Rúbrica de piloto (utilidad, no-cierre diagnóstico, apertura de un significante, tolerancia a contradicción).

### 8.2 Legal / compliance
- [ ] Abogado revisa `/terms` `/privacy` (retención, Venice/OpenAI subprocessors, responsabilidad).  
- [ ] Decidir jurisdicción y entidad contratante.  
- [ ] Confirmar que el producto se presenta como herramienta profesional de reflexión, no dispositivo médico.

### 8.3 Go-to-market (humano)
- [ ] Lista de 10–20 PSM para piloto cerrado.  
- [ ] Precio / freemium (decisión negocio).  
- [ ] Material 1-pager “cómo usarlo en supervisión” (autoría clínica).

### 8.4 Lo que eng NO inventa
Copy clínico final del skill, claims lacanianos fuertes, texto legal vinculante, criterios de “respuesta buena” del golden set.

---

## 9. Acceptance (producto mínimo lanzable a piloto)

1. PSM autenticado puede usar Supervisión lacaniana con panel lógico visible.  
2. Anonimización ack + disclaimer + links legales DRAFT.  
3. Q&A MotusDAO separado.  
4. Riesgo elevado muestra handoff.  
5. §8 en progreso humano (piloto no es GA).

---

## 10. Handoff notes

- Fuente de verdad clínica: `prompts/motusai-skill.md` (humana).  
- Fuente de verdad eng de este corte: este SDD + diffs en chat/landing/legal.  
- Próximo corte eng (si lo piden): hard-gate rol server-side + paywall + memoria opt-in.
