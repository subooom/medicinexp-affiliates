# Conventions, commands, gotchas

## Code
- TypeScript strict; check with `npx tsc --noEmit` (no test suite).
- Styles: `StyleSheet.create` + theme colors from `useAppTheme()` (`colors`, `isDark`); no hard-coded
  hex except the brand gradient. Tinted backgrounds: `color + '1A'`.
- Errors shown to users via `apiErrorMessage(err, fallback)` (never only `console.error`; in dev that
  just shows the red overlay).
- Query params: send booleans as `1/0`; Laravel's `boolean` rule rejects `"true"`.
- Writes that may happen offline go through `sendOrQueue` with a `client_uuid`.
- Comments: short, say why. User-facing text: plain, friendly sentences.

## Running
- **npm only** (`package-lock.json`). Never run `yarn`: a stray `yarn.lock` made EAS install with yarn and fail
  (now in `.gitignore`). New package: add it to `package.json` + `npm install --package-lock-only` so `npm ci` on EAS
  matches. Native modules needing the current build: expo-speech, expo-camera (and the speech/audio/location ones).
- API: no `.env.local` → staging `https://medicinexp-staging.com/api/affiliates`.
  Local server: `EXPO_PUBLIC_API_URL=http://<pc-ip>:8000/api/affiliates` in `.env.local`.
- Dev client (not Expo Go): `npx expo start --dev-client` (add `--clear` after deleting/moving
  files; Metro caches resolutions).
- New native module or native config change → new EAS dev build:
  `npx eas-cli build --profile development --platform android` (APK). JS-only changes don't need one.
  Symptom of an outdated build: `UnsatisfiedLinkError` / missing native method at runtime.
- Phone over USB: Android platform-tools `adb` (not installed system-wide; download from
  dl.google.com to a scratch folder). `adb reverse tcp:8081 tcp:8081` for Metro.

## Push notifications
Not working on Android until Firebase is set up: `google-services.json` in the repo root,
`android.googleServicesFile` in `app.json`, FCM V1 key uploaded via `npx eas-cli credentials`.
`notifications.register()` swallows the token error, so nothing shows in logs.

## Git
- `git -c safe.directory=*` for every command; for `gh`:
  `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*'` and
  `PATH="$PATH:/c/Program Files/GitHub CLI"`.
- Branches: `feat-*`, `fix-*`; stacked PRs allowed (base = previous branch).
