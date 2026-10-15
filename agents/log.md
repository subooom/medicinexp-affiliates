# Log (newest first)

One line per change: date · what · where (PR/branch). Append when you finish work.

- 2026-10-16 · Login no longer stuck on "Waiting for approval": auth/_layout had its own AuthProvider · fix-login-stuck-approval.
- 2026-10-16 · Check-in offers "Save shop to phone contacts" (on for a first visit), saved contacts show the visit;
  shop saves no longer rename a lead's contact · feat-visit-contact.
- 2026-10-15 · Contact sync: lead contacts under an app-owned "MedicineXP" account (native module), call-screen
  status/next step updated on events, removed when the rep leaves; checklist drops the Bronze codes item · feat-contact-sync.
- 2026-10-15 · In-app QR scanner for Team up (expo-camera, loaded lazily; scanned code joins at once) · feat-team-up-scanner.
- 2026-10-15 · How you earn screen ((app)/earn, server text with the rep's numbers, EN/ने, read-aloud), linked
  from dashboard, Earnings (+ first-visit card) and the tour; shared LanguageToggle · feat-how-you-earn.
- 2026-10-15 · Guide read-aloud (expo-speech, play per FAQ/section, Nepali voice check + settings link);
  voice memo checks Nepali recognition first and falls back to plain recording (was a blank 1 s clip) · feat-guide-narration.
- 2026-10-15 · Guide screen (FAQ + sections, EN/ने, links to live screens) linked from Profile; welcome tour
  rewritten (5 slides, EN/ने, returns where it was opened); Back goes to the previous screen · feat-guide.
- 2026-10-15 · Check-in: "Pitching here" program checkboxes (active ticked by default), materials of
  ticked programs only (active first, others labelled "From X"), each ticked program's pitch kit in the
  form (`components/field/pitch-kit-card.tsx`); sends `programs` · feat-checkin-pitch.
- 2026-10-15 · Team up: Team up screen (code + QR deep link, enter code, find nearby),
  live split bar (`components/team-up/`, polled, `hooks/use-team-up.ts` store + host in (app) layout),
  dashboard button + banner, "Were you with X?" after check-in, team line on lead detail · feat-team-up.
- 2026-10-14 · agents/architecture.md is the single entry point (index, keep-current rules,
  anti-abuse); replaces overview.md; CLAUDE.md imports it · PR #2.
- 2026-10-14 · AGENTS.md + agents/ docs; checklist.txt (owner's open-work list).
- 2026-10-13 · Leads "Open" filter sends 1/0; Back from a lead → leads list; visits link the shop's
  lead; lead Sale card + "Convert to sale" (non-MedicineXP) · PR #2 (feat-lead-sales, stacked on #1).
- 2026-10-13 · Leads list shows load errors with retry; visit Back → visits list; screens reload on
  program switch; paused programs greyed in picker; Convert to lead on visits; dashboard colours
  (orange secondary token, tier road card); Leads/Earnings tabs popToTopOnBlur · PR #1.
- 2026-10-13 · "Send sign-up link" on leads (WhatsApp/share, pick code) · PR #1.
- 2026-10-12 · My codes (rename + discount, live earnings), weekly goal card, leaderboard, products in
  pitch kit and lead form · PR #1.
- 2026-10-11/12 · Offline mode, photos, voice memos, call auto-log, coupons, pickups, meetups,
  pitch kit, OSM map, stock, signboard scan, multi-program check-in, EAS dev build · PR #1.
- Tested 2026-10-14 on vivo V2606 (Android 16): call screen shows contact company + job title.
