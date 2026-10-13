# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md: MedicineXP Affiliates app

Expo SDK 57 (React Native, expo-router, TypeScript) field-sales app for medical reps (MRs).
Backend: `../server` (Laravel, `/api/affiliates`). Pharmacy sign-up site: `../landing`.

## Hard rules
- Git here needs `git -c safe.directory=*` (dubious ownership on this drive).
- Run `npx tsc --noEmit` before committing; there is no test suite.
- Every screen is **program-aware** (an MR can be in several programs) and should work **offline**
  (reads from cache, writes through the outbox).
- PRs go into `main` (this repo has no `production` branch).
- Don't commit `TODO.md` or `checklist.txt` changes you didn't make; the owner edits them.

## agents/ directory: read only what you need
| File | Read when |
|---|---|
| `agents/overview.md` | First time here: folders, navigation, offline layer, theme |
| `agents/conventions.md` | Before coding, building or testing on a phone: commands, gotchas |
| `agents/log.md` | What changed recently (newest first). **Append a line when you finish work.** |
| `../server/agents/decisions.md` | Business rules: earning model, codes, holds, teams, contacts |

Open work / to-do: `checklist.txt` (owner's list, plain text). Older roadmap: `TODO.md`.
