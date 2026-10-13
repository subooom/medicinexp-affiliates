# Overview: where things live

## Folders (`src/`)
- `app/`: expo-router routes. `(app)/_layout.tsx` = bottom tabs (Dashboard, Visits, Leads, Earnings,
  Profile); every other folder/screen in `(app)` must be listed in `HIDDEN_ROUTES` there or it shows
  as an extra tab. `auth/`, `onboarding/` outside the tabs.
- `api/`: one file per resource (`leads.ts`, `visits.ts`, `field.ts` = codes/products/activity/kit,
  `auth.ts` = login/me/programs). `client.ts`: axios, auth token, `X-Program-Id` header,
  response cache + offline fallback, error shape `{ message, status, data }`.
- `offline/`: `outbox.ts` + `send.ts` (`sendOrQueue`: offline writes with `client_uuid`),
  `cache.ts`, `venue-index.ts` (search/nearby offline), `sync-provider.tsx` (sync loop + notification
  taps → `router.push(data.screen)`), `notifications.ts` (push token registration, local reminders),
  `demo-video.ts`, `attachments.ts`.
- `context/AuthContext.tsx`: user, memberships, active program (`activeMembership`),
  `switchProgram`, `refreshUser`, `isUsableMembership` (active + program not paused).
- `components/`: `ui/` primitives, `field/` (weekly goal, sign-up link card, attachments, voice memo,
  photo), `leads/` (form, sales card), `programs/program-switcher.tsx`.
- `hooks/data/use-visits.ts`, `utils/` (money `formatPaisa`/`formatRate`, `errors.ts`
  `apiErrorMessage`, `color.ts` `readableColor`, `icons.ts` `toIconName`, `uuid.ts`).
- `types/models.ts`: all API types. Money in paisa, rates in basis points.
- `constants/colors.ts`: theme tokens (light/dark), mirrored as CSS variables in `global.css`.
  `secondary` = brand orange #FF8A00.

## Navigation patterns
- Tabs keep their screens mounted: screens that load once must reload when
  `useAuth().activeMembership?.program?.id` changes (pitch, leaderboard, map, visits list do).
- Opening a screen in another tab: `router.push(href, { withAnchor: true })` + the target stack's
  `unstable_settings = { initialRouteName: 'index' }` so Back lands on that tab's list
  (visits and leads stacks do this).
- Leads and Earnings tabs use `popToTopOnBlur`; never reset a tab on focus.

## Server endpoints used most
`/me`, `/programs`, `/dashboard`, `/visits`, `/leads` (+ `/leads/{id}/signup-link`, `/sales`),
`/coupons` (codes + live earnings data), `/activity`, `/leaderboard`, `/products`, `/field-kit`,
`/pickups`, `/meetups`, `/earnings`.
