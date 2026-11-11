# Quickstart: Tatkal Booking Assistant

**Feature**: 001-tatkal-booking-assistant
**Date**: 2026-05-27

## Prerequisites

- Node.js 18+ (for build tooling)
- Chrome or Edge browser
- 2Captcha account with API key and balance
- IRCTC account with e-Wallet loaded

## Setup

```bash
# Clone and install
git clone <repo-url>
cd IRCTC
npm install

# Build the extension
npm run build

# Output: dist/ directory with compiled extension
```

## Load Extension in Browser

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/` directory
5. Extension icon appears in toolbar

## First-Time Configuration

1. Click the extension icon in toolbar
2. Set **Master Password** (used to encrypt your credentials locally)
3. Enter **IRCTC Credentials** (username + password)
4. Enter **2Captcha API Key** (from your 2captcha.com dashboard)
5. Create a **Booking Template**:
   - Source station (e.g., NDLS)
   - Destination station (e.g., PNBE)
   - Train number (e.g., 12301)
   - Class (e.g., 3A)
   - Passenger details (name, age, gender, ID)

## Booking Day Usage

1. **Before 09:59 AM**: Open Chrome, click extension icon
2. **Unlock** with master password
3. **Select template** for today's journey
4. **Set journey date** (tomorrow's date for Tatkal)
5. Click **"Arm Booking"**
6. **Wait** — extension handles everything:
   - 09:59:50 → Auto-login
   - 10:00:00.000 → Trigger booking flow
   - Auto-search → Auto-select train → Auto-fill passengers → Auto-solve CAPTCHA → Auto-pay via e-Wallet
7. **Watch status** updates in popup
8. **Done** — PNR displayed on confirmation

## Development

```bash
# Dev mode with hot reload
npm run dev

# Run tests
npm test

# Run specific test
npm test -- --grep "ntp-sync"

# Lint
npm run lint
```

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build → `dist/` |
| `npm run dev` | Development build with watch |
| `npm test` | Run all tests (Vitest) |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type checking |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x |
| Extension | Chrome Manifest V3 |
| Build | Vite + CRXJS plugin |
| Testing | Vitest + Playwright |
| Encryption | Web Crypto API (AES-GCM + PBKDF2) |
| Time Sync | WorldTimeAPI / timeapi.io |
| CAPTCHA | 2Captcha HTTP API |
| Storage | chrome.storage.local |
