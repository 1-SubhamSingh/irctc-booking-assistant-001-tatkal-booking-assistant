# Implementation Plan: Tatkal Booking Assistant

**Branch**: `001-tatkal-booking-assistant` | **Date**: 2026-05-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tatkal-booking-assistant/spec.md`

## Summary

A Chrome/Edge browser extension that automates IRCTC Tatkal ticket booking with millisecond-precision timing. The extension pre-fills journey/passenger data, auto-logs in at 09:59:50 AM, triggers booking at exactly 10:00:00.000 AM via NTP sync, auto-solves CAPTCHAs via 2Captcha API, and completes payment via IRCTC e-Wallet — targeting end-to-end completion in under 60 seconds.

## Technical Context

**Language/Version**: TypeScript 5.x (extension code), HTML/CSS (popup UI)

**Primary Dependencies**: Chrome Extension Manifest V3 APIs, 2Captcha API client, Web Crypto API (credential encryption), NTP/WorldTimeAPI

**Storage**: Chrome `chrome.storage.local` (encrypted credentials, journey templates, passenger data)

**Testing**: Vitest (unit tests), Playwright (integration tests against mock IRCTC pages)

**Target Platform**: Chrome/Edge browser extension (Manifest V3)

**Project Type**: browser-extension

**Performance Goals**: Complete booking flow (search → fill → pay) in under 60 seconds; NTP sync accuracy within ±50ms; CAPTCHA solve + fill within 15 seconds

**Constraints**: Must operate within Chrome extension security model (content scripts + background service worker); no direct network bypass; must handle IRCTC DOM changes gracefully

**Scale/Scope**: Single user, single booking session at a time, 1-6 passengers per booking

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is in template state (no project-specific principles defined). No active gates to enforce. Proceeding with reasonable defaults:
- Single-purpose extension (no unnecessary abstraction)
- Security: credentials encrypted at rest
- Testability: DOM interaction layer decoupled from business logic

**Result: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-tatkal-booking-assistant/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── manifest.json            # Chrome Extension Manifest V3
├── background/
│   ├── service-worker.ts    # Background service worker (timers, NTP sync, alarms)
│   └── ntp-sync.ts          # NTP time synchronization module
├── content/
│   ├── injector.ts          # Content script entry point (injected into IRCTC pages)
│   ├── pages/
│   │   ├── login.ts         # Login page automation
│   │   ├── search.ts        # Train search page automation
│   │   ├── passenger.ts     # Passenger form fill automation
│   │   └── payment.ts       # Payment page automation (e-Wallet selection)
│   ├── captcha/
│   │   ├── detector.ts      # CAPTCHA element detection
│   │   └── solver.ts        # 2Captcha API integration
│   └── retry/
│       └── handler.ts       # Error detection and auto-retry logic
├── popup/
│   ├── popup.html           # Extension popup UI
│   ├── popup.ts             # Popup logic (config, status display)
│   └── components/
│       ├── journey-form.ts  # Journey details input form
│       ├── passenger-form.ts# Passenger details input form
│       ├── settings.ts      # API keys, credentials config
│       └── status.ts        # Real-time booking status display
├── shared/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── storage.ts           # Chrome storage abstraction (encrypted)
│   ├── crypto.ts            # Credential encryption/decryption
│   └── constants.ts         # IRCTC selectors, URLs, timing constants
└── assets/
    ├── icons/               # Extension icons (16, 48, 128px)
    └── styles/              # Popup CSS

tests/
├── unit/
│   ├── ntp-sync.test.ts
│   ├── crypto.test.ts
│   ├── storage.test.ts
│   └── retry-handler.test.ts
├── integration/
│   ├── login-flow.test.ts
│   ├── booking-flow.test.ts
│   └── captcha-flow.test.ts
└── mocks/
    └── irctc-pages/         # Mock HTML pages for testing
```

**Structure Decision**: Single browser extension project with clear separation between background worker (timing/orchestration), content scripts (DOM automation), and popup (user configuration UI). No backend server needed — all logic runs client-side.

## Complexity Tracking

No violations to justify — architecture follows the simplest approach for a browser extension with Manifest V3.
