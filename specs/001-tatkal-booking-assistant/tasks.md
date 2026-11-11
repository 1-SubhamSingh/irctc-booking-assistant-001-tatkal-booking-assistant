# Tasks: Tatkal Booking Assistant

**Input**: Design documents from `specs/001-tatkal-booking-assistant/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build tooling, and extension scaffold

- [X] T001 Initialize Node.js project with package.json, TypeScript config, and Vite + CRXJS plugin in project root
- [X] T002 [P] Create Chrome Extension manifest.json with Manifest V3 config (permissions, content scripts, service worker) in src/manifest.json
- [X] T003 [P] Create shared TypeScript interfaces and types in src/shared/types.ts
- [X] T004 [P] Create IRCTC constants (selectors, URLs, timing values) in src/shared/constants.ts
- [X] T005 [P] Create extension icons (16, 48, 128px placeholders) in src/assets/icons/
- [X] T006 [P] Configure Vitest for unit testing in vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules that ALL user stories depend on — encryption, storage, and messaging

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement credential encryption/decryption module (AES-GCM + PBKDF2) using Web Crypto API in src/shared/crypto.ts
- [X] T008 Implement Chrome storage abstraction with encrypt/decrypt integration in src/shared/storage.ts
- [X] T009 [P] Implement extension messaging layer (popup ↔ background ↔ content script message passing) in src/shared/messaging.ts
- [X] T010 [P] Create background service worker entry point with message listener registration in src/background/service-worker.ts
- [X] T011 [P] Create content script entry point with page detection and MutationObserver setup in src/content/injector.ts
- [X] T012 Implement NTP time synchronization module (WorldTimeAPI fetch, offset calculation, precision timer) in src/background/ntp-sync.ts

**Checkpoint**: Foundation ready — encryption, storage, messaging, time sync all operational

---

## Phase 3: User Story 1 — Pre-fill Journey & Passenger Details (Priority: P1) 🎯 MVP

**Goal**: User can save journey details, passengers, and credentials before Tatkal opening time

**Independent Test**: Open extension popup → fill journey + passengers → verify data persists correctly in encrypted storage → review pre-filled data

### Implementation for User Story 1

- [X] T013 [P] [US1] Create popup HTML shell with navigation (Settings, Template, Status tabs) in src/popup/popup.html
- [X] T014 [P] [US1] Create popup entry point with tab switching logic in src/popup/popup.ts
- [X] T015 [US1] Implement Settings component (master password setup, IRCTC credentials input, 2Captcha API key) in src/popup/components/settings.ts
- [X] T016 [US1] Implement Journey Form component (source, destination, date, train number, class, quota selection) in src/popup/components/journey-form.ts
- [X] T017 [US1] Implement Passenger Form component (add/edit/remove passengers with IRCTC validation rules) in src/popup/components/passenger-form.ts
- [X] T018 [US1] Implement booking template save/load/delete logic with encrypted storage in src/popup/components/template-manager.ts
- [X] T019 [US1] Add passenger validation (max 4 per Tatkal, name format, ID format per type, age constraints) in src/shared/validators.ts
- [X] T020 [US1] Add popup CSS styling for all form components in src/assets/styles/popup.css

**Checkpoint**: User can configure credentials, save journey + passengers, and review pre-filled data. Extension popup fully functional.

---

## Phase 4: User Story 2 — Rapid Booking Execution at Tatkal Opening (Priority: P1) 🎯 MVP

**Goal**: Extension auto-logs in at 09:59:50, triggers at 10:00:00.000, and executes entire booking flow automatically

**Independent Test**: Arm booking → extension logs in at 09:59:50 → triggers search at 10:00:00 → fills passenger form → selects e-Wallet → completes payment (end-to-end < 60s)

### Implementation for User Story 2

- [X] T021 [US2] Implement login page automator (detect login page, fill username/password, submit) in src/content/pages/login.ts
- [X] T022 [US2] Implement train search page automator (fill source, destination, date, class, quota, submit search) in src/content/pages/search.ts
- [X] T023 [US2] Implement train selection automator (find train by number in results, select Tatkal class, click book) in src/content/pages/train-select.ts
- [X] T024 [US2] Implement passenger form automator (fill all passenger fields, select berth/ID, submit) in src/content/pages/passenger.ts
- [X] T025 [US2] Implement payment page automator (select IRCTC e-Wallet, confirm payment) in src/content/pages/payment.ts
- [X] T026 [US2] Implement booking orchestrator in background (state machine: LOGIN→SEARCH→SELECT→FILL→PAY→CONFIRM) in src/background/orchestrator.ts
- [X] T027 [US2] Implement arm/disarm booking logic with alarm scheduling (09:59:50 login, 10:00:00.000 trigger) in src/background/scheduler.ts
- [X] T028 [US2] Implement page change detection and routing (detect which IRCTC page loaded, dispatch correct automator) in src/content/page-router.ts
- [X] T029 [US2] Wire popup Arm/Disarm button to background scheduler via messaging in src/popup/components/arm-button.ts

**Checkpoint**: Full automated booking flow works end-to-end: login → search → select → fill → pay. Triggered automatically at Tatkal time.

---

## Phase 5: User Story 3 — Auto-Retry on Failures and Errors (Priority: P2)

**Goal**: Extension handles IRCTC errors (heavy load, timeouts, CAPTCHAs) without losing progress

**Independent Test**: Simulate error conditions → verify retry logic fires within 2s → verify CAPTCHA is auto-solved → verify session re-auth on timeout

### Implementation for User Story 3

- [X] T030 [P] [US3] Implement error detection module (detect "heavy load", session expired, network errors on page) in src/content/retry/error-detector.ts
- [X] T031 [P] [US3] Implement CAPTCHA image detector (find CAPTCHA img element, extract as base64) in src/content/captcha/detector.ts
- [X] T032 [US3] Implement 2Captcha API client (submit image, poll for result, handle errors) in src/content/captcha/solver.ts
- [X] T033 [US3] Implement retry handler (exponential backoff 500ms→3s, max 30 retries, step-aware retry) in src/content/retry/handler.ts
- [X] T034 [US3] Implement session timeout recovery (detect redirect to login, re-authenticate, resume from last step) in src/background/session-recovery.ts
- [X] T035 [US3] Integrate CAPTCHA solver into booking orchestrator (detect → solve → fill → continue flow) in src/background/orchestrator.ts
- [X] T036 [US3] Integrate retry handler into all page automators (wrap each step with retry logic) in src/content/pages/*.ts

**Checkpoint**: Extension recovers from errors, solves CAPTCHAs automatically, and retries failed steps without restarting.

---

## Phase 6: User Story 4 — Booking Status Notifications (Priority: P3)

**Goal**: User sees real-time progress and gets clear confirmation/failure notifications

**Independent Test**: Run booking flow → verify popup shows step-by-step status updates → verify PNR shown on success → verify failure reason shown on error

### Implementation for User Story 4

- [X] T037 [P] [US4] Implement status update broadcasting from orchestrator to popup via chrome.runtime messaging in src/background/status-broadcaster.ts
- [X] T038 [US4] Implement Status Display component (step indicators, progress messages, timestamps) in src/popup/components/status.ts
- [X] T039 [US4] Implement booking result notification (PNR display on success, error reason on failure, browser notification) in src/popup/components/result-notification.ts
- [X] T040 [US4] Add chrome.notifications API integration for system-level booking alerts in src/background/notifications.ts

**Checkpoint**: User has full visibility into booking progress with real-time updates and clear outcome notifications.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, edge cases, and production readiness

- [X] T041 [P] Add input sanitization and XSS prevention for all stored data in src/shared/sanitize.ts
- [X] T042 [P] Add graceful handling for IRCTC DOM changes (fallback selectors, version detection) in src/shared/constants.ts
- [X] T043 Implement master password unlock flow on extension open (decrypt credentials for session) in src/popup/components/unlock.ts
- [X] T044 [P] Add error boundary and crash recovery (save state periodically, resume on extension reload) in src/background/crash-recovery.ts
- [X] T045 Run quickstart.md validation (verify build, load in Chrome, configure, and test full flow)
- [X] T046 [P] Add build scripts (npm run build, npm run dev) and verify dist/ output in package.json and vite.config.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — popup and storage must be ready
- **User Story 2 (Phase 4)**: Depends on Phase 2 + Phase 3 (needs saved data to auto-fill)
- **User Story 3 (Phase 5)**: Depends on Phase 4 (retry/CAPTCHA logic wraps booking flow)
- **User Story 4 (Phase 6)**: Depends on Phase 4 (status updates come from orchestrator)
- **Polish (Phase 7)**: Depends on Phases 3-6

### User Story Dependencies

- **US1 (P1)**: Independent after Foundation — delivers pre-fill + config UI
- **US2 (P1)**: Requires US1 data — delivers the automated booking flow
- **US3 (P2)**: Requires US2 orchestrator — adds resilience layer
- **US4 (P3)**: Requires US2 orchestrator — adds visibility layer

### Within Each User Story

- Page automators can be built in parallel [P] (different files)
- Orchestrator depends on all page automators
- UI components can be built in parallel [P]

### Parallel Opportunities

```
Phase 2 parallel set: T009, T010, T011 (messaging, background, content)
Phase 3 parallel set: T013, T014 (popup shell + entry point)
Phase 4 parallel set: T021, T022, T023, T024, T025 (all page automators)
Phase 5 parallel set: T030, T031 (error detector + captcha detector)
Phase 6 parallel set: T037 (status broadcaster)
Phase 7 parallel set: T041, T042, T044, T046 (all independent hardening tasks)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012)
3. Complete Phase 3: US1 — Pre-fill UI (T013-T020)
4. Complete Phase 4: US2 — Booking Automation (T021-T029)
5. **STOP and VALIDATE**: Test full booking flow end-to-end
6. ✅ MVP delivered — can book Tatkal tickets automatically

### Incremental Delivery

1. Setup + Foundation → Core infrastructure ready
2. Add US1 → User can save booking templates (partial value)
3. Add US2 → Full automated booking flow (core value delivered!)
4. Add US3 → Resilient booking with retry + CAPTCHA solving
5. Add US4 → Full visibility and notifications
6. Polish → Production-hardened extension

---

## Notes

- [P] tasks = different files, no dependencies on each other
- [US*] label maps task to specific user story
- Target total task completion for MVP (Phases 1-4): ~29 tasks
- CAPTCHA solving (US3) is critical for real-world success but MVP can test without it on non-peak hours
- Commit after each task or logical group
