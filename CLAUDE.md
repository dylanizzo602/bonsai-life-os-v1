# Bonsai Life OS — Claude Code Guide
Use this file as persistent project instructions for Claude Code sessions. Keep changes scoped, verifiable, and consistent with existing architecture.

## Documentation index (Claude Code)
Before browsing docs, fetch the index at `https://code.claude.com/docs/llms.txt` so you can discover all pages first.

## Quick commands (project root)
- **Install**: `npm install`
- **Dev server**: `npm run dev` (Vite on `http://localhost:5173`)
- **Lint**: `npm run lint`
- **Build (typecheck + build)**: `npm run build`
- **Preview build**: `npm run preview`
- **Supabase CLI passthrough**: `npm run supabase -- <command>`

## Verification rules (always do this)
- **Prefer self-verifying work**: when you change code, run the narrowest check that proves it works.
- **For UI/TS changes**: run `npm run lint` and (when meaningful) `npm run build`.
- **For DB/schema changes**: ensure the migration is created under `supabase/migrations/` and applied with `supabase db push`.

## Architecture rules (do not violate)
- **UI/data separation**:
  - **UI layer**: `src/components/`, `src/features/` (React components + UI-only logic)
  - **Hook layer**: `src/features/**/hooks/` (state, loading/error, business coordination)
  - **Data access**: `src/lib/supabase/` (all Supabase queries/mutations)
  - Do **not** call Supabase directly from UI components; go through hooks + the data layer.
- **Task logic consistency across breakpoints**:
  - Desktop/tablet/mobile task UIs must share the same helpers/hooks for due/overdue classification, date display text, filtering, and completion transitions.
  - Visual layout may differ; business logic must not diverge.
- **Component reuse**:
  - Before creating a new reusable component, search for an existing one in `src/components/` and extend it when possible.
- **Responsive-first UI**:
  - Use mobile-first Tailwind classes, then enhance with `md:` and `lg:`. Avoid desktop-first styling.
- **Typography**:
  - Page titles should use `text-page-title`.
  - Body text should use `text-body`.
  - Labels/metadata should use `text-secondary`.

## Supabase workflow (schema, functions, policies)
- **All schema changes** must be done via migrations in `supabase/migrations/` (create with `supabase migration new <name>`).
- **Apply migrations** with `supabase db push` (avoid ad-hoc schema edits outside migrations).
- **Enums (e.g., task priority)** are managed in the DB. Do not hard-code new enum values in the app without a migration.

## Code edit conventions (important)
- **Section comments**: when writing new code or editing existing code, add/update brief comments for each logical section so intent is easy to follow.
- **Keep changes minimal**: prefer small, focused diffs that match existing patterns.
- **Avoid long-lived background processes** unless explicitly asked (dev server is fine when needed for verification).
