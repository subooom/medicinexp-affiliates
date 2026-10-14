# 📋 MedicineXP Affiliates — Project TODO

Status legend:
- `[x]` done and verified against the app **and** the API
- `[ ]` not done
- `[ ] ⚠️` was marked done, but verification (2026-10-11) found it broken or partial — note says why

Ticks are updated as work lands. Every item is built **program-aware** (see Decisions).

---

## 🧭 Decisions (2026-10-11)

- **Programs vs venues.** "Organization" currently means two things. Split into:
  - **Programs** — companies that run an MR channel (MedicineXP is program #1; pharma companies later).
  - **Venues** — pharmacies / clinics / hospitals that MRs visit. Shared across all programs.
- **MRs can join many programs** (memberships). Each membership has its own tier, coupons, commissions and payouts. The app has a **program switcher** so an MR can sell MedicineXP and pharma products side by side (hidden while only one program exists).
- **Every record is scoped to a program**, set and enforced by the server, not the app.
- **Stock is a movement ledger** (hub ↔ MR bag ↔ venue), not a single quantity column.
- **One sales → commission → weekly payout pipeline.** Sales come from a source (MedicineXP subscription payment = automatic; pharma = manual/import). Payouts run weekly per program (Friday for MedicineXP).
- **Roles:** platform admin, program admin, program staff, MR.
- **Admin + Program portal is a web portal in Laravel** (not in the mobile app).
- **Money stored in paisa (integers); all dates in Asia/Kathmandu.**
- **Offline demo = recorded video.**
- Staging affiliate tables may be wiped; migrations get rewritten cleanly.

### Decisions (2026-10-12)

- ~~Commission is opt-in per MR, default none.~~ *Replaced by the earning model below (only renewal-year commission is manual).*
- **Subscription amounts are NPR** (`tenant_subscriptions.amount`, rupees).
- **No Gemini / server-side AI in the MR app.** Anyone with the app could run up the bill (e.g. 1,000 signboard photos). Voice memos are audio + optional **on-device** speech-to-text; signboard capture uses **on-device** text recognition. Nothing costs per use.
- **Nothing is deployed until tested.** One week of testing in dev first.
- **Portals are web, responsive (phone first)** at `/portal`, Tailwind with the MedicineXP tokens and Josefin Sans. Logins live in `aff_portal_users` with the existing role enum (platform admin / program admin / program staff), not the `users` table. First login: `php artisan affiliates:portal-user you@example.com`.

### Decisions (2026-10-13)

- **Maps use OpenStreetMap** (Leaflet in a WebView), not Google Maps: no key, no per-use cost. The tile server is configurable (`EXPO_PUBLIC_MAP_TILE_URL`) if usage outgrows the public OSM servers.
- **One check-in, many programs.** The check-in screen shows every program's materials in the rep's bag; the server stores one visit per program (same place and time), so each program only sees its own.
- **Push notifications go through Expo's push service** (no server credentials). Reminders are also scheduled on the phone so they fire offline.
- ~~Tier coupon_count = extra single-use coupons~~ *Replaced: codes are referral codes, see below.*

### Earning model (2026-10-12, the point of the gamification)

- **Tiers raise commission.** New rep: no tier, 0%, no codes. First lead → **Bronze** automatically: first code + year-1 rate. Reps climb on their own as they hit targets and never drop. Seeded year-1 rates **10 / 12 / 15 / 18 / 20%** (Bronze → Diamond), renewals from Gold (3%; Platinum 4/3%; Diamond 5/4%), sized to the real plan prices (रू 10k–60k first year). Rates are **locked per pharmacy at sign-up** (new sales only).
- **Admin extras add on top** of the tier, per year (year 1 extra and manual year 2/3).
- **Coupon = referral code.** Each tier unlocks codes: Bronze 1, Silver +1, Gold +2, Platinum +4, Diamond +5. Reusable. The rep names each code (4–12 chars, e.g. SAR-52) and sets its discount.
- **Self-preserving discounts:** commission = rate × price before the code − the discount in rupees, never below 0; a discount can't exceed the rep's year-1 rate. MedicineXP never pays more than with no discount. The code's discount is year 1 only and locked at sign-up; pharmacies from before keep today's billing.
- **Products per program** (MedicineXP linked to central plans): pitched in the app, picked on leads, recorded on sales, used for rupee amounts.
- **Weekly activity bonus, per sale:** points for verified visits (GPS ≤300 m or shop photo, one per shop per day), leads with phone numbers, calls, sales, pickups, meetups — with caps. Bonus per sale = tier max (रू 150 → 400) × score ÷ target (40) × streak boost (+10%/week, max +50%). **No sale by the cutoff = points expire.** Groundwork on a lead carries over 3 weeks if it converts. Held until payment clears. No bonus for reaching a tier; the only fixed bonus is the रू 100 sign-up bonus.
- **Payout cycle configurable per program** (weekly / every N weeks / monthly / set dates) with a cutoff. MedicineXP: **Friday, sales by Wednesday night**; later sales go in the next payout.
- Weekly goal card, Monday/new-week and day-before-cutoff nudges, leaderboard, celebrations, earnings calculator in the portal.

---

## 🛠️ Phase 0 — Stabilize

- [x] Commit the app and push to GitHub
- [x] Server: new branch off latest production for the affiliate rebuild (`feat-affiliate-programs`)
- [x] Fix `visitApi` import break (check-in, lead form, call-log form)
- [x] Fix all TypeScript errors (`npx tsc --noEmit` passes)
- [x] Server: fix route order (`/stats`, `/monthly`, `/summary`, `/search` shadowed by `/{id}`)
- [x] Server: fix dead routes — tier-by-program route repaired; coupon routes and organization DELETE removed until they're rebuilt (coupons: Phase 2, venue delete: Phase 1)
- [x] Server: stop mass-assigning `$request->all()` on updates
- [x] Server: feature tests for the affiliate API *(isolated `medicinexp_testing` DB with a guard; run `php vendor/bin/phpunit tests/Feature/Affiliates`)*

## 🧱 Phase 1 — Foundation (program-aware data model)

- [x] Rewrite affiliate migrations: `aff_programs`, `aff_venues`, `aff_memberships` (+ all other `aff_*` tables; legacy tables dropped where they exist)
- [x] Program scoping on every affiliate table, enforced server-side (`affiliate.program` middleware + `forProgram()`)
- [x] Roles & permissions (platform admin / program admin / program staff / MR) *(portal: staff can look and run pickups/meetups; admins change reps, money, tiers, settings; platform admins see every program)*
- [x] Stock ledger: locations (hub, MR bag) + movements; drop-offs checked against the MR's bag under a lock
- [x] Sales, commissions, payout runs, payout items, bonuses (tables, models, MR earnings API; creating commissions from payments is Phase 2)
- [x] Seed MedicineXP as program #1 with its tiers and materials *(renewal-year rates 3/4/6/7/9% are placeholders to confirm)*
- [x] App: active-program context + switcher (hidden with one program)
- [x] App: move every screen to the new API (`/venues` instead of `/organizations`, new lead/visit/earnings fields, money in paisa)
- [x] Server: offline-safe writes — every record accepts a phone-generated `client_uuid` (repeats are ignored) and the time recorded on the phone, so queued items keep their real time and don't trip the 10-minute rule

## 📶 Offline mode (field reps work with bad signal all day)

- [x] Outbox queue on the phone that survives app restarts; sends in order when back online *(reconnect, app foreground, every minute, and in the background)*
- [x] Visits, check-ins, drop-offs, leads and call logs can all be created offline *(also places, pickups, meetup requests; items made offline link up by client_uuid)*
- [x] Photos and voice memos queue and upload separately
- [x] Venues, leads, materials, rep stock and earnings stored on the phone and refreshed when online *(every GET cached per program; venues indexed for offline search and nearby)*
- [x] "N waiting to sync" indicator and a way to retry failed items *(banner + Sync screen)*
- [x] Demo video downloaded once and stored on the phone *(automatically on Wi-Fi, or on demand)*

---

## 👤 1. Affiliate / MR Features

### Previously marked complete (re-verified 2026-10-11)

- [x] Affiliate can login
- [x] Affiliate can create account
- [x] Affiliate can see the hint modal
- [x] Affiliate can create a visit *(fixed 2026-10-11: `visitApi` restored; visit date now uses the local day, not UTC)*
- [x] Affiliate can edit a visit *(notes, status, reschedule a planned visit; works offline)*
- [x] Affiliate can browse visits *(fixed: load more)*
- [x] Affiliate can view a visit *(fixed: real detail screen)*
- [x] Affiliate can search for an organization while creating/editing a visit
- [x] Affiliate can create an organization while creating/editing a visit
- [x] Affiliate can search nearby organizations while creating/editing a visit
- [x] Affiliate can distribute a marketing material while creating/editing a visit *(from the MR's bag, linked to the visit)*
- [x] Affiliate can choose a lead_type while creating/editing a lead (`customer` | `associate` | `organization` | `contact`)
- [x] Affiliate can search for an organization while creating/editing a lead
- [x] Affiliate can create a lead *(email optional)*
- [x] Affiliate can edit a lead *(full edit form)*
- [x] Affiliate can view a lead
- [x] Affiliate can browse leads
- [x] Affiliate can create a call log with a lead
- [x] Affiliate can edit a call log with a lead *(fixed: partial update keeps links; HH:MM:SS accepted)*
- [x] Affiliate can read a call log's detail page
- [x] Affiliate can browse the call logs they created *(fixed: status filter lag)*
- [x] Affiliate can see last call log from the leads list page *(fixed: `latestCallLog` relation)*
- [x] Affiliate can click the last call log from the leads list page to go to call log read page
- [x] Affiliate can schedule a call log with an organization or a lead
- [x] Affiliates can see their total earnings *(fixed in app: amounts with commas parse correctly; commissions screen shows रू and no longer crashes on string amounts. Server should still send plain numbers — Phase 1)*
- [x] Affiliates can see how much they are getting paid that week
- [x] Affiliate can, during check in, tap the select material option to select it and to open a material modal showing materials show page with basic detail, image, and their distribution history for that marketing material
- [x] Affiliate can, during check in, add selected material with help of +1, +2, etc. buttons *(+1/+2/+5, capped by bag and per-visit limit on the server)*
- [x] Affiliate can set organization type during organization creation
- [x] Affiliate can register a visit every 10 minutes
- [x] Affiliate can see the tier list summary page
- [x] Affiliate can see the tier detail page
- [x] Affiliates can view a link to organizations list page in their profile
- [x] Affiliates can view a link to call logs list page in their profile
- [x] Affiliates can view a link to coupons list page in their profile
- [x] Affiliates can view a link to distributions list page in their profile
- [x] Affiliates can edit a call log from organizations edit modal *(venue page → call → edit)*
- [x] Affiliates can browse/filter organizations in organizations list page *(type and "added by me" filters, search, paging)*
- [x] Affiliates can read organization details in organizations details page *(fixed: call logs section)*

### Pending features & enhancements

- [x] Affiliate can view a video of the sign-up process *(Pitch kit: the program uploads its demo / sign-up walkthrough video in the portal; plays offline)*
- [x] Affiliates can create a call log from call logs list page
- [x] Affiliates can edit a call log from call logs edit modal *(edit screen)*
- [x] Affiliates can delete a call log from call logs list page *(long-press)*
- [x] Affiliates can browse/filter call logs in call logs list page
- [x] Affiliates can read call log details in call logs details page
- [x] Affiliates can create an organization from call logs list page
- [x] Affiliates can delete an organization from organizations list page *(from the venue page; only venues you added, with no activity)*
- [x] Affiliates can edit organizations they have created
- [x] ~~Affiliates can create a distribution from distributions list page~~ *(replaced: drop-offs are recorded at check-in, from the MR's bag)*
- [x] ~~Affiliates can edit a distribution from distributions edit modal~~ *(replaced: stock ledger rows are never edited; corrections are adjustments by the program)*
- [x] ~~Affiliates can delete a distribution from distributions list page~~ *(replaced: same as above)*
- [x] Affiliates can browse/filter distributions in distributions list page *(Drop-offs list)*
- [x] Affiliates can read distributions details in distributions details page *(opens the visit it was left on)*
- [x] Affiliates can view a link to meetups list page in their profile
- [x] Affiliates can view an inventory list page in their profile *(My stock)*
- [x] Affiliate can manage an inventory bucket/cart (add and remove products/materials) *(materials request: pick quantities, send to the program)*
- [x] Affiliate can see their new coupon codes when they level up
- [x] Affiliates can see a list of coupon codes assigned to them, all with different perks *(referral code + tier coupons with their discount; QR and share)*
- [x] Affiliates should be encouraged to use their coupon code to sign up pharmacies/medical organizations *(referral code is their sign-up coupon; QR on dashboard and profile)*
- [x] Affiliates can see the coupons assigned to them in the coupons list page
- [x] Affiliate can register a sale *(automatic from paid subscriptions)*
- [x] Affiliate can see how much they earned
- [x] Affiliates can see when they will be getting the withdrawal *(next payout date, delay reason)*
- [x] Affiliates can verify the payment cycle *(payout day, next date, delay and reason, payout history, push when paid)*
- [x] Affiliates can get sign-up bonus of 100 rupees which they can withdraw on their first sale, along with the commission *(held on approval, released with the first sale)*
- [x] Affiliates can see paid status when the payment has been made
- [x] Affiliates can see their payment history
- [x] Affiliate can view the marketing materials assigned to them
- [x] Affiliate can request marketing material / supplies from an Organization
- [x] Affiliate can view marketing material pickup request status *(push when approved or declined)*
- [x] Affiliate can pick up marketing material and supplies from an Organization hub *(hand-over moves stock hub → bag)*
- [x] Affiliate can correctly view their stock/bucket of marketing materials during check-in
- [x] Affiliate can see scheduled call logs *(Upcoming tab + dashboard)*
- [x] Affiliate can see a meetup if it's been scheduled with an Organization or MedicineXP
- [x] Affiliate can request a meeting with MedicineXP / Organization
- [x] Affiliate can mark as being in the location when they arrive for pickup/meetup

### 🆕 Field & selling features (added 2026-10-11)

- [x] Affiliate can switch between their programs (e.g. MedicineXP ↔ a pharma company)
- [x] **Referral QR code / link** — pharmacy signs up on its own phone with the MR's code pre-filled; sale is credited automatically *(QR + share link; landing pre-fills ?coupon=)*
- [x] **Sign-up filled from the visit** — "Send sign-up link" on a lead (WhatsApp/share, pick which code), or the pharmacy enters the rep's code + its PAN on the landing page ("Has a MedicineXP rep visited you?"). Owner, shop, PAN, address and the pitched plan come pre-filled; the pharmacy is tied to that exact lead and venue
- [x] Pharmacy subscription payment automatically creates the MR's commission (no manual "convert lead") *(when an admin marks the subscription paid; reversals void or claw back)*
- [x] **Offline demo video** of MedicineXP, downloaded to the phone and playable without internet
- [x] **Live earnings** — "You earned रू X this week, paid Friday", each commission named after the pharmacy that paid *(commissions appear once Phase 2 creates them from payments)*
- [x] **Voice memos** — tap to record after a visit; audio attached to the visit/lead, on-device speech-to-text (English/नेपाली) where the phone supports it (no server AI)
- [x] **One-tap check-in with GPS and a shop photo** as proof of visit *(portal shows photos and distance from the shop)*
- [x] **Follow-up reminders** — push notifications from scheduled call logs *(server push every 5 min + local reminders that work offline; also lead follow-up dates)*
- [x] **Map of nearby pharmacies** — visited / interested / signed-up / not-yet-visited pins for route planning *(OpenStreetMap)*
- [x] **Add a pharmacy by photographing its signboard or license** — on-device text recognition suggests name, address, phone and PAN (no server AI)
- [x] **Objection notes & pricing cheat sheet** — per program: "they already use X, so say Y", current plans and discounts *(Pitch kit, offline)*
- [x] **Tap to call or WhatsApp a lead**, logging the call automatically *(back in the app: "We talked / No answer", duration estimated)*
- [x] **One check-in for several programs** — hand out MedicineXP and pharma materials in one visit; the server files each program's part separately
- [x] Join another program with an invite code, accept/decline invitations, sign up with an invite code
- [x] **Tiers raise commission**; automatic promotion from the first lead; rates locked per pharmacy
- [x] **My codes:** rename, set discount, live "you earn" per product; more codes per tier
- [x] **Weekly activity bonus** per sale with streaks, carry-over and expiry; Wednesday cutoff for Friday pay
- [x] **Weekly goal card, leaderboard, nudges, celebrations**
- [x] **Products** shown in the pitch kit and picked on leads

---

## 🏢 2. Organization (Program) Portal — web

### 📦 Materials & Inventory Management
- [x] Organization can add, edit, and delete marketing materials and products *(with photos; used materials are hidden, not deleted)*
- [x] Organization can browse all marketing materials and view detail pages
- [x] Organization can manage its local stock/inventory of marketing materials and supplies *(hubs, stock arriving, write-offs, where each item is)*

### 🏆 Tier Management
- [x] Organization can add a tier list
- [x] Organization can edit a tier list
- [x] Organization can remove a tier list *(tiers with reps are switched off instead)*
- [x] Organization can read a tier detail page
- [x] Organization can browse a list of tiers

### 🤝 MR Collaboration & Pickup Requests
- [x] Organization can login & manage profile *(Program page: profile, payout day, sign-up bonus, referral discount)*
- [x] Organization can invite MRs / Affiliates (via email, link, or code) *(email invite, or the program invite code)*
- [x] Organization can view and manage list of invited/linked MRs
- [x] Organization can view marketing material/supply pickup requests or inventory bucket submissions from MRs
- [x] Organization can approve/reject MR material pickup requests
- [x] Organization can set pickup date, time, and location for MRs
- [x] Organization can hand off marketing materials/supplies to MRs upon arrival
- [x] Organization can schedule meetups with linked MRs by picking time, date, and location
- [x] Organization can mark arrival at pickup/meetup location
- [x] Organization can view material distribution analytics across its linked MRs (e.g., pie chart / reports) *(by material and by rep, 7/30/90/365 days)*

### 💰 Earning & gamification (portal)
- [x] Tier rates per year, codes unlocked, activity bonus per sale
- [x] Earnings calculator per tier and product
- [x] Products catalogue (with central plan link for MedicineXP)
- [x] Payout cycle, cutoff, activity points/caps/target/streak, leaderboard switch
- [x] Rep extra commission per year on top of the tier

### 🆕 Selling content
- [x] Organization can manage its objection notes & pricing cheat sheet
- [x] Organization can upload its offline demo video

---

## 👑 3. Admin Portal — web

### 🔐 Auth & Account
- [x] Admin can login *(`php artisan affiliates:portal-user` for the first one, then the Team page)*
- [x] Admin can change own email and password

### 🏢 Organization & MR Management
- [x] Admin can approve or deactivate Organization accounts *(All programs: add with first admin, approve, switch off)*
- [x] Admin can approve or deactivate Affiliate/MR accounts
- [x] Admin can change an Affiliate or Organization password *(rep app password on the rep page; portal logins reset from Team)*
- [x] Admin can level up an affiliate *(tier on the rep page; issues the tier's coupons)*
- [x] Admin can give custom bonus to an affiliate
- [x] Admin can set which MRs earn commission and at what rate per subscription year (default: none)

### 📅 Meetups & Direct Coordination
- [x] Admin can schedule high-level meetups with Organizations / Affiliates *(platform admins can invite other programs' teams)*
- [x] Admin can mark as being in the location when arriving for a scheduled meetup

### 💰 Finance, Sales & Payment Cycles
- [x] Admin can mark sales requests as proven, refunded, etc.
- [x] Weekly payment cycle will be on Friday of every week *(per-program payout day, Friday by default)*
- [x] Admin can set the payment delay if any delay has happened
- [x] Admin can delay the cycle globally with a reason and an apology email

---

## 🔜 Before the pilot (needs you)

- [ ] Rebuild the dev app — new native modules (camera, audio, speech and text recognition, notifications, video, WebView, background task): `npx expo run:android`
- [ ] Run the new migrations in dev (`php artisan migrate --path=database/migrations/affiliate`) and re-run the affiliate seeder (tier coupon counts changed)
- [ ] Create the first portal login: `php artisan affiliates:portal-user you@medicinexp.com --name="Your Name"`
- [ ] Scheduler running (`affiliates:send-reminders` every 5 min) and `php artisan storage:link` (demo videos, material photos)
- [ ] Upload the demo video and write the cheat sheet in the portal (Program page)
- [ ] Confirm the tier rates and activity bonus amounts in the portal's **earnings calculator** (Tiers page) against your margins — seeded: 10/12/15/18/20% year 1, रू 150–400 bonus per sale
- [ ] Add MedicineXP's products if the seeder didn't find your plans (Products page), and link each to its plan
- [ ] Deploy the landing changes (`landing-features`: `cea767a` 4–12 character codes, `bd7bc8e` sign-up filled from the rep's visit + phone layout) together with the server, or custom codes won't verify and invite links won't fill
- [ ] Set `AFFILIATE_SIGNUP_URL` on the server to the live get-started page (invite links and QR codes point there)
- [ ] Try an invite end to end: lead with a venue (PAN, address) and product → "Send sign-up link" → open on a phone → sign up → the lead and venue show the pharmacy
- [ ] Test on 2–3 real phones: offline check-in then back online, voice memo in Nepali, signboard scan, reminders, two-program check-in

## 🚀 Launch

- [ ] Pilot with 3–5 MRs for one week
- [ ] Roll out to the full network (20–25 MRs)
