# Current State (WIP)

Last updated: 2026-05-05

## Product Direction

- Repository is being narrowed to a single core funnel around MotusAI clinical chat.
- Priority path: login/auth -> onboarding/registro -> chat (`/motusai`) -> perfil.
- Legacy multi-product surfaces are being removed to reduce complexity.

## Active Core Areas

- Frontend stack: Next.js App Router + TypeScript + Tailwind + shadcn/ui.
- Main active pages: `/`, `/motusai`, `/perfil`, onboarding/registro flow.
- State/theme/role: Zustand store with `usuario` and `psm` roles.
- Auth/web3 infra is present (WaaP/Celo/Prisma-related setup in project).

## Recent UI Changes (MotusAI)

- Added `components/ui/animated-ai-chat.tsx`.
- Added `components/ui/demo.tsx`.
- Reworked `app/motusai/page.tsx` to:
  - Use the new animated chat interface.
  - Keep sidebar cards (`Acciones Rapidas`, `Historial de Chats`).
  - Align card visual style with lighter premium border treatment.
- Extended `app/globals.css` with `.lab-bg::before` overflow safety rule.

## Removed / Being Removed

- Multiple legacy routes and APIs are currently deleted in the working tree (admin, matching, sessions, academia, bitacora, docs, pagos, videochat, and related components).
- Source of truth for removals should be current git status, not old README sections.

## Documentation Strategy

- Keep this file as the short working source of truth during refactor.
- Delay full README/docs rewrite until structural changes stabilize.

## Next Cleanup Pass (when ready)

- Extract shared "premium light border" tokens/utilities for global consistency.
- Apply the style system across remaining active pages/components.
- Finalize a full docs update after route/API pruning is complete.
