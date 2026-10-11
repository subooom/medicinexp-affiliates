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
- [ ] Roles & permissions (platform admin / program admin / program staff / MR) — `aff_portal_users` roles exist; enforcement comes with the web portal
- [x] Stock ledger: locations (hub, MR bag) + movements; drop-offs checked against the MR's bag under a lock
- [x] Sales, commissions, payout runs, payout items, bonuses (tables, models, MR earnings API; creating commissions from payments is Phase 2)
- [x] Seed MedicineXP as program #1 with its tiers and materials *(renewal-year rates 3/4/6/7/9% are placeholders to confirm)*
- [x] App: active-program context + switcher (hidden with one program)
- [x] App: move every screen to the new API (`/venues` instead of `/organizations`, new lead/visit/earnings fields, money in paisa)
- [x] Server: offline-safe writes — every record accepts a phone-generated `client_uuid` (repeats are ignored) and the time recorded on the phone, so queued items keep their real time and don't trip the 10-minute rule

## 📶 Offline mode (field reps work with bad signal all day)

- [ ] Outbox queue on the phone that survives app restarts; sends in order when back online
- [ ] Visits, check-ins, drop-offs, leads and call logs can all be created offline
- [ ] Photos and voice memos queue and upload separately
- [ ] Venues, leads, materials, rep stock and earnings stored on the phone and refreshed when online
- [ ] "N waiting to sync" indicator and a way to retry failed items
- [ ] Demo video downloaded once and stored on the phone

---

## 👤 1. Affiliate / MR Features

### Previously marked complete (re-verified 2026-10-11)

- [x] Affiliate can login
- [x] Affiliate can create account
- [x] Affiliate can see the hint modal
- [x] Affiliate can create a visit *(fixed 2026-10-11: `visitApi` restored; visit date now uses the local day, not UTC)*
- [ ] ⚠️ Affiliate can edit a visit — notes and status editable; rescheduling a planned visit is supported by the API but not in the app yet
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
- [ ] ⚠️ Affiliates can view a link to coupons list page in their profile — link now opens a "coming soon" screen; coupons feature and server `CouponController` still to build
- [x] Affiliates can view a link to distributions list page in their profile
- [x] Affiliates can edit a call log from organizations edit modal *(venue page → call → edit)*
- [x] Affiliates can browse/filter organizations in organizations list page *(type and "added by me" filters, search, paging)*
- [x] Affiliates can read organization details in organizations details page *(fixed: call logs section)*

### Pending features & enhancements

- [ ] Affiliate can view a video of the sign-up process
- [x] Affiliates can create a call log from call logs list page
- [x] Affiliates can edit a call log from call logs edit modal *(edit screen)*
- [x] Affiliates can delete a call log from call logs list page *(long-press)*
- [x] Affiliates can browse/filter call logs in call logs list page
- [x] Affiliates can read call log details in call logs details page
- [ ] Affiliates can create an organization from call logs list page
- [x] Affiliates can delete an organization from organizations list page *(from the venue page; only venues you added, with no activity)*
- [x] Affiliates can edit organizations they have created
- [x] ~~Affiliates can create a distribution from distributions list page~~ *(replaced: drop-offs are recorded at check-in, from the MR's bag)*
- [x] ~~Affiliates can edit a distribution from distributions edit modal~~ *(replaced: stock ledger rows are never edited; corrections are adjustments by the program)*
- [x] ~~Affiliates can delete a distribution from distributions list page~~ *(replaced: same as above)*
- [x] Affiliates can browse/filter distributions in distributions list page *(Drop-offs list)*
- [x] Affiliates can read distributions details in distributions details page *(opens the visit it was left on)*
- [ ] Affiliates can view a link to meetups list page in their profile
- [x] Affiliates can view an inventory list page in their profile *(My materials)*
- [ ] Affiliate can manage an inventory bucket/cart (add and remove products/materials)
- [ ] Affiliate can see their new coupon codes when they level up
- [ ] Affiliates can see a list of coupon codes assigned to them, all with different perks
- [x] Affiliates should be encouraged to use their coupon code to sign up pharmacies/medical organizations *(referral code is their sign-up coupon; QR on dashboard and profile)*
- [ ] Affiliates can see the coupons assigned to them in the coupons list page
- [x] Affiliate can register a sale *(automatic from paid subscriptions)*
- [x] Affiliate can see how much they earned
- [x] Affiliates can see when they will be getting the withdrawal *(next payout date, delay reason)*
- [ ] Affiliates can verify the payment cycle
- [x] Affiliates can get sign-up bonus of 100 rupees which they can withdraw on their first sale, along with the commission *(held on approval, released with the first sale)*
- [x] Affiliates can see paid status when the payment has been made
- [x] Affiliates can see their payment history
- [x] Affiliate can view the marketing materials assigned to them
- [ ] Affiliate can request marketing material / supplies from an Organization
- [ ] Affiliate can view marketing material pickup request status
- [ ] Affiliate can pick up marketing material and supplies from an Organization hub
- [x] Affiliate can correctly view their stock/bucket of marketing materials during check-in
- [x] Affiliate can see scheduled call logs *(Upcoming tab + dashboard)*
- [ ] Affiliate can see a meetup if it's been scheduled with an Organization or MedicineXP
- [ ] Affiliate can request a meeting with MedicineXP / Organization
- [ ] Affiliate can mark as being in the location when they arrive for pickup/meetup

### 🆕 Field & selling features (added 2026-10-11)

- [x] Affiliate can switch between their programs (e.g. MedicineXP ↔ a pharma company)
- [x] **Referral QR code / link** — pharmacy signs up on its own phone with the MR's code pre-filled; sale is credited automatically *(QR + share link; landing pre-fills ?coupon=)*
- [x] Pharmacy subscription payment automatically creates the MR's commission (no manual "convert lead") *(when an admin marks the subscription paid; reversals void or claw back)*
- [ ] **Offline demo video** of MedicineXP, downloaded to the phone and playable without internet
- [x] **Live earnings** — "You earned रू X this week, paid Friday", each commission named after the pharmacy that paid *(commissions appear once Phase 2 creates them from payments)*
- [ ] **Voice memos** — hold to record after a visit; transcribed (mixed Nepali/English) into summary, objections, interest level and follow-up date
- [ ] **One-tap check-in with GPS and a shop photo** as proof of visit
- [ ] **Follow-up reminders** — push notifications from scheduled call logs
- [ ] **Map of nearby pharmacies** — visited / interested / signed-up / not-yet-visited pins for route planning
- [ ] **Add a pharmacy by photographing its signboard or license** — name, address and phone filled in automatically
- [ ] **Objection notes & pricing cheat sheet** — per program: "they already use X, so say Y", current plans and discounts
- [ ] **Tap to call or WhatsApp a lead**, logging the call automatically *(call and WhatsApp buttons done on the lead page; automatic logging still to do)*

---

## 🏢 2. Organization (Program) Portal — web

### 📦 Materials & Inventory Management
- [ ] Organization can add, edit, and delete marketing materials and products
- [ ] Organization can browse all marketing materials and view detail pages
- [ ] Organization can manage its local stock/inventory of marketing materials and supplies

### 🏆 Tier Management
- [ ] Organization can add a tier list
- [ ] Organization can edit a tier list
- [ ] Organization can remove a tier list
- [ ] Organization can read a tier detail page
- [ ] Organization can browse a list of tiers

### 🤝 MR Collaboration & Pickup Requests
- [ ] Organization can login & manage profile
- [ ] Organization can invite MRs / Affiliates (via email, link, or code)
- [ ] Organization can view and manage list of invited/linked MRs
- [ ] Organization can view marketing material/supply pickup requests or inventory bucket submissions from MRs
- [ ] Organization can approve/reject MR material pickup requests
- [ ] Organization can set pickup date, time, and location for MRs
- [ ] Organization can hand off marketing materials/supplies to MRs upon arrival
- [ ] Organization can schedule meetups with linked MRs by picking time, date, and location
- [ ] Organization can mark arrival at pickup/meetup location
- [ ] Organization can view material distribution analytics across its linked MRs (e.g., pie chart / reports)

### 🆕 Selling content
- [ ] Organization can manage its objection notes & pricing cheat sheet
- [ ] Organization can upload its offline demo video

---

## 👑 3. Admin Portal — web

### 🔐 Auth & Account
- [ ] Admin can login
- [ ] Admin can change own email and password

### 🏢 Organization & MR Management
- [ ] Admin can approve or deactivate Organization accounts
- [ ] Admin can approve or deactivate Affiliate/MR accounts
- [ ] Admin can change an Affiliate or Organization password
- [ ] Admin can level up an affiliate
- [ ] Admin can give custom bonus to an affiliate

### 📅 Meetups & Direct Coordination
- [ ] Admin can schedule high-level meetups with Organizations / Affiliates
- [ ] Admin can mark as being in the location when arriving for a scheduled meetup

### 💰 Finance, Sales & Payment Cycles
- [ ] Admin can mark sales requests as proven, refunded, etc.
- [ ] Weekly payment cycle will be on Friday of every week
- [ ] Admin can set the payment delay if any delay has happened
- [ ] Admin can delay the cycle globally with a reason and an apology email

---

## 🚀 Launch

- [ ] Pilot with 3–5 MRs for one week
- [ ] Roll out to the full network (20–25 MRs)
