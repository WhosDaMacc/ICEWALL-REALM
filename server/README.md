# Server-side code (moved out of `src/`)

These files are the Express / Next.js backend for ICEWALL-REALM. They were
moved here from `src/` on 2026-11-10 so the React frontend (`npm run build`,
react-scripts) can actually build: the frontend's type checker scans all of
`src/`, and these files import packages that are not installed and do not
exist in this repo — `express`, `cors`, `typeorm`, `winston`,
`winston-daily-rotate-file`, `next`, `openai` — and `src/index.ts`
(the old Express entry) also imports a `./services/` folder that was never
committed.

Nothing was deleted. To revive the backend:

1. `npm install express cors typeorm pg winston winston-daily-rotate-file next openai`
2. Recreate `src/services/` (`UserManagementService`, `ARRealmManager`,
   `EmailService`, `VerificationService` — referenced by `server/index.ts`
   but never committed) or point the entry at the real service files.
3. Run the entry from here instead of `src/index.ts`.

Files moved:
- `src/index.ts` → `server/index.ts` (Express entry)
- `src/middleware/index.ts`, `src/routes/index.ts`,
  `src/error-handling/index.ts`, `src/logging/index.ts`,
  `src/exceptions/HttpException.ts`
- `src/database/migrations/*` → `server/database/migrations/*`
- `src/pages/api/ai/chat.ts` → `server/api/ai/chat.ts` (Next.js API route)
- `src/scripts.js` → `server/scripts.js` (plain DOM script)
