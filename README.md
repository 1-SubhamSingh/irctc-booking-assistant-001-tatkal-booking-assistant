# IRCTC Tatkal Booking Assistant

A personal Chrome/Edge extension that helps prepare and run the IRCTC Tatkal booking flow faster by using saved journey and passenger templates.

The extension automates repetitive form steps on the official IRCTC website, including login, train search, train/class selection, passenger details, review-page handoff, and e-Wallet payment selection. CAPTCHA entry remains manual.

## Features

- Save reusable journey templates with source, destination, date, train number, class, quota, and Tatkal type.
- Save passenger details with name, age, gender, berth preference, nationality, and ID fields.
- Encrypt stored IRCTC credentials with a master password.
- Sync booking trigger timing using internet time APIs.
- Auto-login before Tatkal opening.
- Auto-search trains and select the configured train/class.
- Fill passenger details on the IRCTC passenger form.
- Handle the review booking CAPTCHA flow by waiting for manual input, then clicking Continue.
- Select IRCTC e-Wallet / instant payment and click Pay & Book.
- Provide console/status logs for each booking step.

## Tech Stack

- TypeScript
- Chrome Extension Manifest V3
- Vite
- CRXJS
- Chrome storage APIs
- Web Crypto API

## Project Structure

```text
src/
  background/       Extension service worker, scheduler, orchestration
  content/          IRCTC page automation scripts
  popup/            Extension popup UI
  shared/           Types, storage, crypto, constants, validators
  assets/           Popup styles and extension icons
specs/
  001-tatkal-booking-assistant/
```

## Setup

Install dependencies:

```bash
npm install
```

Run type checking:

```bash
npm run typecheck
```

Build the extension:

```bash
npm run build
```

The build output is generated in:

```text
dist/
```

## Load In Chrome Or Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist` folder.
5. Open the extension popup and configure credentials, journey, passengers, and template.

## Booking Flow

1. Unlock the extension using the master password.
2. Save or select a booking template.
3. Use Test Now or arm the booking for the Tatkal opening time.
4. The extension runs login, search, train selection, and passenger form fill.
5. On the review page, manually type the CAPTCHA.
6. The extension detects completed CAPTCHA input and clicks Continue.
7. On the payment page, the extension selects e-Wallet instant payment and clicks Pay & Book.

## Notes

- This is intended for personal use with the official IRCTC website.
- CAPTCHA solving is not bypassed; CAPTCHA entry is manual.
- IRCTC UI changes may require selector updates in `src/shared/constants.ts` and page automators under `src/content/pages/`.
- Server-side IRCTC delays cannot be removed by the extension.

## Useful Commands

```bash
npm run typecheck
npm run build
npm run test
```

## Suggested GitHub Topics

`irctc`, `tatkal`, `chrome-extension`, `edge-extension`, `typescript`, `vite`, `manifest-v3`, `automation`, `booking-assistant`
