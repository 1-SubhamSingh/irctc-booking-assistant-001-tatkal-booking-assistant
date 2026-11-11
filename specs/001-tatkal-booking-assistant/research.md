# Research: Tatkal Booking Assistant

**Feature**: 001-tatkal-booking-assistant
**Date**: 2026-05-27

## Research Tasks

### 1. Chrome Extension Manifest V3 — Content Script + Service Worker Architecture

**Decision**: Use Manifest V3 with content scripts for DOM manipulation and a background service worker for timing/orchestration.

**Rationale**:
- Manifest V3 is the current standard (MV2 deprecated since 2024)
- Content scripts have direct DOM access to IRCTC pages — essential for form filling and button clicking
- Service workers handle alarms/timers independently of page lifecycle (critical for 09:59:50 login trigger)
- `chrome.storage.local` provides persistent encrypted storage without needing a backend
- `chrome.alarms` API enables precise scheduled actions

**Alternatives considered**:
- Manifest V2: Deprecated, Chrome Web Store no longer accepts MV2 extensions
- Puppeteer/Playwright standalone: Requires Node.js runtime, separate browser instance, more complex setup for end-user
- Userscript (Tampermonkey): Limited APIs, no background service worker, no alarms, harder credential management

### 2. NTP Time Synchronization in Browser Extension Context

**Decision**: Use WorldTimeAPI (`worldtimeapi.org/api/timezone/Asia/Kolkata`) or `timeapi.io` to calculate clock offset, then use `performance.now()` for precise triggering.

**Rationale**:
- Browser extensions cannot access raw NTP (UDP port 123) — browsers don't support UDP sockets
- HTTP-based time APIs provide IST time accurate to ~100-500ms network latency
- Calculate offset: `server_time - local_time = offset`
- Use `performance.now()` (microsecond precision) for the final countdown after offset is known
- Sync multiple times (3-5 requests) before 10:00 AM and average the offset to reduce jitter
- Trigger at `local_time + offset = 10:00:00.000 IST`

**Alternatives considered**:
- System clock only: Can be off by seconds; IRCTC servers use IST precisely
- NTP via native messaging: Adds complexity (requires native app), not worth it
- Server-side relay: Adds latency and a dependency; HTTP time API is simpler

### 3. CAPTCHA Solving via 2Captcha API

**Decision**: Use 2Captcha HTTP API. Capture CAPTCHA image from DOM → base64 encode → POST to 2Captcha → poll for result → fill input.

**Rationale**:
- 2Captcha supports image CAPTCHAs (IRCTC uses simple text/numeric CAPTCHAs)
- Average solve time: 5-15 seconds (acceptable within 60s budget)
- Simple HTTP API: `POST /in.php` to submit, `GET /res.php` to retrieve answer
- Cost: ~$2-3 per 1000 CAPTCHAs (negligible for personal use)
- Anti-Captcha is an equivalent alternative with similar API

**Alternatives considered**:
- Manual solving: Adds 5-10 seconds of user reaction time + typing; user might not be watching
- Local OCR (Tesseract.js): IRCTC CAPTCHAs have noise/distortion; accuracy ~60-70% without training
- ML model (TensorFlow.js): Requires trained model, large bundle size, IRCTC changes CAPTCHA style periodically

**Implementation approach**:
1. Content script detects CAPTCHA `<img>` element on page
2. Extract image via `canvas.toDataURL()` or fetch the image URL
3. Send base64 to background service worker (content scripts have CORS limits)
4. Service worker calls 2Captcha API
5. Poll every 2 seconds until solved (typical: 2-5 polls)
6. Return solution to content script → fill input → submit

### 4. Credential Encryption at Rest

**Decision**: Use Web Crypto API with AES-GCM encryption, key derived from user's master password via PBKDF2.

**Rationale**:
- Web Crypto API is native to browsers — no external libraries needed
- AES-256-GCM provides authenticated encryption (tamper detection)
- PBKDF2 with 100,000+ iterations makes brute-force infeasible
- Salt + IV stored alongside ciphertext in `chrome.storage.local`
- User enters master password once per session to unlock credentials

**Alternatives considered**:
- Plain text storage: Unacceptable security risk
- Chrome's `chrome.storage.session`: Lost on browser restart, not persistent
- OS keychain via native messaging: Adds native app dependency, complex installation

### 5. IRCTC Booking Flow DOM Automation Strategy

**Decision**: Use CSS selector-based DOM queries with MutationObserver for dynamic content detection.

**Rationale**:
- IRCTC is an Angular-based SPA — pages load dynamically, not via traditional navigation
- `MutationObserver` detects when new forms/elements appear after Angular renders
- CSS selectors target form fields by `id`, `name`, `formControlName`, or `class`
- Selectors stored in `constants.ts` for easy updates when IRCTC changes layout
- Sequential step execution: wait for element → fill/click → wait for next page → repeat

**Key IRCTC page sequence** (based on known workflow):
1. `/home` → Login form (username, password, CAPTCHA)
2. `/eticketing/train-search` → Source, destination, date, class selection
3. Train list → Select train, check Tatkal availability
4. Passenger form → Fill name, age, gender, berth, ID proof for each passenger
5. Payment page → Select IRCTC e-Wallet → Confirm

**Alternatives considered**:
- XPath: More brittle, harder to maintain
- `document.querySelector` only (no observer): Would miss dynamically loaded content
- Intercepting Angular's internal state: Too fragile, breaks on any framework update

### 6. Retry Strategy for "Heavy Load" Errors

**Decision**: Aggressive retry with exponential backoff starting at 500ms, max 3 seconds between retries, up to 30 retries total within the 3-minute window.

**Rationale**:
- IRCTC "heavy load" occurs in the first 1-2 minutes after Tatkal opens
- Aggressive initial retry (500ms) maximizes chance of getting through early
- Cap at 3 seconds prevents wasting too much time on any single retry gap
- 30 retries over ~60-90 seconds covers the critical window
- Detect error by: page content containing "try again", HTTP 503/429 responses, Angular error overlays

**Error detection patterns**:
- Text match: "please try again", "heavy traffic", "service unavailable"
- HTTP status: 503, 429, 500
- Session expired: redirect to login page
- CAPTCHA reload: new CAPTCHA image appeared (re-solve)

**Alternatives considered**:
- Fixed interval: Wastes time if server recovers quickly
- No retry: Unacceptable — the primary failure mode
- Parallel requests: Not possible in single-browser-tab context; would require multiple tabs (complex, detectable)
