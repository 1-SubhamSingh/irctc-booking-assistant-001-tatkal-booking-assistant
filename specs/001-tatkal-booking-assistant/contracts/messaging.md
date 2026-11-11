# Extension Messaging Contract

**Feature**: 001-tatkal-booking-assistant
**Date**: 2026-05-27

This defines the message-passing contract between the extension's three layers:
- **Popup** (user configuration UI)
- **Background** (service worker — timing, orchestration, API calls)
- **Content Script** (DOM automation on IRCTC pages)

## Message Format

All messages follow this structure:

```typescript
interface ExtensionMessage {
  type: string;        // Action identifier
  payload?: unknown;   // Action-specific data
  requestId?: string;  // For request-response correlation
}

interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  requestId?: string;
}
```

## Popup → Background Messages

### `SAVE_CREDENTIALS`
Save encrypted IRCTC credentials.
```typescript
{ type: "SAVE_CREDENTIALS", payload: { username: string, password: string, masterPassword: string } }
// Response: { success: true }
```

### `SAVE_TEMPLATE`
Save a booking template (journey + passengers).
```typescript
{ type: "SAVE_TEMPLATE", payload: { name: string, journey: Journey, passengers: Passenger[] } }
// Response: { success: true, data: { templateId: string } }
```

### `SAVE_CAPTCHA_CONFIG`
Save CAPTCHA service configuration.
```typescript
{ type: "SAVE_CAPTCHA_CONFIG", payload: { serviceProvider: string, apiKey: string } }
// Response: { success: true }
```

### `ARM_BOOKING`
Arm the booking for a specific template (set it to trigger at Tatkal time).
```typescript
{ type: "ARM_BOOKING", payload: { templateId: string } }
// Response: { success: true, data: { triggerTime: string, loginTime: string } }
```

### `DISARM_BOOKING`
Cancel an armed booking.
```typescript
{ type: "DISARM_BOOKING" }
// Response: { success: true }
```

### `GET_STATUS`
Get current booking session status.
```typescript
{ type: "GET_STATUS" }
// Response: { success: true, data: { session: BookingSession, ntpOffset: number, armed: boolean } }
```

### `UNLOCK`
Unlock the extension with master password (decrypts credentials for the session).
```typescript
{ type: "UNLOCK", payload: { masterPassword: string } }
// Response: { success: true } | { success: false, error: "Invalid master password" }
```

## Background → Content Script Messages

### `START_LOGIN`
Initiate auto-login on the IRCTC login page.
```typescript
{ type: "START_LOGIN", payload: { username: string, password: string } }
// Response: { success: true } | { success: false, error: "Login page not detected" }
```

### `START_SEARCH`
Fill and submit the train search form.
```typescript
{ type: "START_SEARCH", payload: { source: string, destination: string, date: string, class: string, quota: string } }
// Response: { success: true } | { success: false, error: string }
```

### `SELECT_TRAIN`
Select the specified train from search results.
```typescript
{ type: "SELECT_TRAIN", payload: { trainNumber: string, classType: string } }
// Response: { success: true, data: { available: boolean, seats: number } }
```

### `FILL_PASSENGERS`
Fill the passenger form with pre-saved data.
```typescript
{ type: "FILL_PASSENGERS", payload: { passengers: Passenger[] } }
// Response: { success: true }
```

### `SOLVE_CAPTCHA`
Request CAPTCHA image extraction from page.
```typescript
{ type: "SOLVE_CAPTCHA" }
// Response: { success: true, data: { imageBase64: string, inputSelector: string } }
```

### `FILL_CAPTCHA`
Fill the solved CAPTCHA value into the input.
```typescript
{ type: "FILL_CAPTCHA", payload: { solution: string } }
// Response: { success: true }
```

### `SELECT_PAYMENT`
Auto-select IRCTC e-Wallet payment method.
```typescript
{ type: "SELECT_PAYMENT", payload: { method: "IRCTC_WALLET" } }
// Response: { success: true }
```

### `CLICK_SUBMIT`
Click the submit/proceed button on the current page.
```typescript
{ type: "CLICK_SUBMIT", payload: { buttonSelector?: string } }
// Response: { success: true }
```

## Content Script → Background Messages

### `PAGE_CHANGED`
Notify background that a new IRCTC page/view has loaded.
```typescript
{ type: "PAGE_CHANGED", payload: { url: string, pageType: PageType } }
// PageType: "LOGIN" | "SEARCH" | "TRAIN_LIST" | "PASSENGER_FORM" | "PAYMENT" | "CONFIRMATION" | "ERROR" | "UNKNOWN"
```

### `ERROR_DETECTED`
Notify background that an error was detected on the page.
```typescript
{ type: "ERROR_DETECTED", payload: { errorType: ErrorType, message: string } }
// ErrorType: "HEAVY_LOAD" | "SESSION_EXPIRED" | "CAPTCHA_FAILED" | "NETWORK_ERROR" | "TRAIN_UNAVAILABLE" | "UNKNOWN"
```

### `BOOKING_CONFIRMED`
Notify that booking was successfully completed.
```typescript
{ type: "BOOKING_CONFIRMED", payload: { pnr: string, trainNumber: string, date: string, passengers: string[] } }
```

### `CAPTCHA_DETECTED`
Notify that a CAPTCHA element appeared on the page.
```typescript
{ type: "CAPTCHA_DETECTED", payload: { imageBase64: string } }
```

## Background → Popup Messages (Status Updates)

### `STATUS_UPDATE`
Real-time status push to popup UI.
```typescript
{ type: "STATUS_UPDATE", payload: { step: string, message: string, timestamp: string, retryCount?: number } }
```

### `BOOKING_RESULT`
Final booking result notification.
```typescript
{ type: "BOOKING_RESULT", payload: { success: boolean, pnr?: string, error?: string } }
```
