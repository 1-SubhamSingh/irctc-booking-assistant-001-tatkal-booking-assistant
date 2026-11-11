# Feature Specification: Tatkal Booking Assistant

**Feature Branch**: `001-tatkal-booking-assistant`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "I want to build a personal Tatkal booking assistant that helps me prepare and complete the ticket booking process faster on the IRCTC official website. Currently when trying to book a Tatkal ticket at 10 AM for AC Tatkal, it shows 'please try again heavy load', and after 3-4 minutes (around 10:05 AM) when load reduces, all tickets are booked by agents or software users. The main aim is to book the ticket faster in less than 1 minute to get a confirmed ticket."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-fill Journey & Passenger Details (Priority: P1)

As a user, I want to prepare all my booking details (journey date, train number, class, passengers, payment info) in advance so that when Tatkal booking opens at 10:00 AM, I can submit the booking request instantly without manually typing anything.

**Why this priority**: The biggest time loss in manual Tatkal booking is filling forms under pressure. Pre-filling eliminates this bottleneck entirely and is the core value proposition.

**Independent Test**: Can be fully tested by entering journey details beforehand and verifying they are correctly stored and ready for instant submission. Delivers value by reducing form-fill time from 2-3 minutes to near zero.

**Acceptance Scenarios**:

1. **Given** I have opened the assistant before 10:00 AM, **When** I enter my journey details (source, destination, date, train, class, passengers), **Then** all details are saved and validated for correctness.
2. **Given** I have saved my passenger details (name, age, gender, berth preference, ID proof), **When** I review the pre-filled form, **Then** all fields match what I entered and are formatted correctly for IRCTC submission.
3. **Given** I have pre-loaded my IRCTC e-Wallet with sufficient balance, **When** the booking flow reaches payment, **Then** the extension auto-selects e-Wallet and completes payment instantly without external redirects.

---

### User Story 2 - Rapid Booking Execution at Tatkal Opening (Priority: P1)

As a user, I want the assistant to execute the entire booking flow (search train → select class → fill passengers → proceed to payment) as fast as possible once Tatkal opens at 10:00 AM, so that I can secure a confirmed ticket before availability runs out.

**Why this priority**: Speed of execution is the core problem being solved. Even with pre-filled data, the booking steps must be automated rapidly to beat the rush window.

**Independent Test**: Can be tested by initiating the booking flow and measuring total time from start to payment page. Target is under 60 seconds for the entire form submission flow.

**Acceptance Scenarios**:

1. **Given** Tatkal booking has opened and my details are pre-filled, **When** the NTP-synced clock hits 10:00:00.000 AM, **Then** the extension auto-triggers and navigates through search, train selection, passenger form, and payment within 60 seconds.
2. **Given** the IRCTC site shows "heavy load" errors, **When** the assistant encounters such errors, **Then** it automatically retries the failed step without losing progress.
3. **Given** I have triggered the booking, **When** the train or class is unavailable, **Then** I am immediately notified so I can make alternative decisions.

---

### User Story 3 - Auto-Retry on Failures and Errors (Priority: P2)

As a user, I want the assistant to handle IRCTC errors (heavy load messages, session timeouts, CAPTCHA challenges) gracefully so that I don't lose my place in the booking flow and can still get a ticket.

**Why this priority**: IRCTC is notoriously unreliable at peak times. Without intelligent retry logic, even fast form submission will fail due to server errors.

**Independent Test**: Can be tested by simulating error responses and verifying the assistant retries appropriately without restarting the entire flow.

**Acceptance Scenarios**:

1. **Given** the IRCTC site returns a "please try again" error, **When** the assistant encounters this, **Then** it retries the same step within 2 seconds.
2. **Given** a session timeout occurs, **When** the assistant detects the timeout, **Then** it re-authenticates and resumes from where it left off.
3. **Given** a CAPTCHA is presented, **When** the assistant encounters a CAPTCHA, **Then** it sends the CAPTCHA image to the configured solving service and auto-fills the solution within 15 seconds.

---

### User Story 4 - Booking Status Notifications (Priority: P3)

As a user, I want real-time feedback on the booking progress so that I know what step the assistant is on and whether my ticket is confirmed.

**Why this priority**: Visibility into the process reduces anxiety and helps me intervene if needed (e.g., CAPTCHA solving, alternate train selection).

**Independent Test**: Can be tested by running a booking flow and verifying that each step produces a visible status update.

**Acceptance Scenarios**:

1. **Given** the booking flow is in progress, **When** each step completes, **Then** I see a status update (e.g., "Searching trains...", "Filling passengers...", "Proceeding to payment...").
2. **Given** the booking is confirmed, **When** the confirmation page loads, **Then** I receive a clear notification with PNR number and ticket details.
3. **Given** the booking fails permanently, **When** all retries are exhausted, **Then** I receive a failure notification with the reason.

---

### Edge Cases

- What happens when IRCTC changes its website layout or form structure?
- How does the system handle when the selected train is removed from Tatkal quota?
- What happens when IRCTC introduces new CAPTCHA types?
- How does the system handle intermittent network connectivity?
- What happens if multiple passengers have the same name format?
- How does the system behave when payment gateway times out?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to pre-fill and save journey details (source station, destination station, journey date, train number/name, class type) before Tatkal opening time.
- **FR-002**: System MUST allow users to save multiple passenger details (name, age, gender, berth preference, ID type, ID number) with validation against IRCTC format requirements.
- **FR-003**: System MUST auto-select IRCTC e-Wallet as the payment method and complete payment instantly from pre-loaded wallet balance, eliminating external gateway redirects and approval delays.
- **FR-004**: System MUST execute the booking flow (train search → availability check → passenger form fill → payment page) using pre-saved data with minimal manual intervention.
- **FR-005**: System MUST automatically retry failed steps (server errors, timeouts, "heavy load" messages) without restarting the entire booking flow.
- **FR-006**: System MUST automatically solve CAPTCHAs by sending them to a configured third-party solving service (2Captcha/Anti-Captcha) and filling the result. System MUST alert the user only when manual intervention is required (OTP entry, payment authorization).
- **FR-007**: System MUST provide real-time progress updates showing which step of the booking flow is currently active.
- **FR-008**: System MUST complete the automated portion of the booking flow (excluding CAPTCHA and payment authorization) within 60 seconds under normal conditions.
- **FR-009**: System MUST preserve all entered data if the session is interrupted, allowing seamless resumption.
- **FR-010**: System MUST work with the official IRCTC website (irctc.co.in) and interact with it as a logged-in user would.
- **FR-011**: System MUST validate all passenger details against IRCTC's rules (max passengers per ticket, valid ID formats, age constraints) before attempting submission.
- **FR-012**: System MUST support AC Tatkal booking (10:00 AM opening) and Non-AC Tatkal booking (11:00 AM opening).
- **FR-013**: System MUST store user's IRCTC credentials in encrypted local storage and automatically log in at 09:59:50 AM (or 10:59:50 AM for Non-AC) to ensure a fresh active session before Tatkal opens.
- **FR-014**: System MUST securely encrypt stored credentials using a user-defined master password or browser's built-in credential storage API.
- **FR-015**: System MUST sync with an NTP time source (or equivalent accurate internet time API) and auto-trigger the booking flow at exactly 10:00:00.000 AM (or 11:00:00.000 AM for Non-AC) with millisecond precision, independent of the user's system clock.

### Key Entities

- **Journey**: Represents a planned trip with source station, destination station, date, preferred train(s), and class (AC/Non-AC).
- **Passenger**: A traveler's details including name, age, gender, berth preference, ID proof type, and ID number. Multiple passengers can be associated with one journey.
- **Booking Session**: An active attempt to book tickets, tracking current step, retry count, errors encountered, and final outcome (confirmed/failed).
- **Payment Preference**: Saved payment method details (type, associated account identifier) for quick selection.
- **Booking Template**: A reusable saved configuration combining journey and passenger details for frequent routes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the entire booking form submission (from Tatkal opening to reaching payment page) in under 60 seconds.
- **SC-002**: The system successfully handles and recovers from "heavy load" errors in at least 80% of attempts without user intervention.
- **SC-003**: Pre-filling passenger and journey details reduces manual input time by at least 90% compared to typing manually on IRCTC.
- **SC-004**: Users receive booking confirmation (or clear failure notification) within 3 minutes of Tatkal opening time.
- **SC-005**: The system successfully reaches the payment page in at least 70% of booking attempts during peak Tatkal window (10:00-10:05 AM).
- **SC-006**: Users report reduced booking anxiety through clear progress visibility and automatic error handling.

## Clarifications

### Session 2026-05-27

- Q: What deployment form factor should the assistant use? → A: Browser extension (Chrome/Edge) running directly on the IRCTC website.
- Q: How should the extension handle IRCTC CAPTCHAs? → A: Third-party CAPTCHA solving service (2Captcha/Anti-Captcha) via API.
- Q: How should the extension handle login? → A: Store encrypted credentials locally and auto-login at 09:59:50 AM (10 seconds before Tatkal opens).
- Q: Which payment method should the extension optimize for? → A: IRCTC e-Wallet (pre-loaded balance) for instant payment with no external approvals or redirects.
- Q: How should the extension initiate booking at Tatkal opening time? → A: NTP-synced auto-trigger at exactly 10:00:00.000 AM with millisecond precision.

## Assumptions

- User has a valid IRCTC account and stores credentials (username/password) in the extension's encrypted local storage.
- The extension auto-logs into IRCTC at 09:59:50 AM to ensure a fresh, active session when Tatkal booking opens at 10:00:00 AM.
- User has a stable internet connection during the booking window.
- The assistant is delivered as a Chrome/Edge browser extension that operates directly on the official IRCTC website (irctc.co.in) with full DOM access.
- CAPTCHA solving is handled via a third-party CAPTCHA solving service (2Captcha/Anti-Captcha) that the user configures with their own API key.
- Payment is handled via IRCTC e-Wallet with pre-loaded balance — no external payment gateway, UPI approval, or OTP is needed.
- The system is for personal use only (single user booking their own tickets), not for commercial ticket resale.
- IRCTC's basic booking workflow (search → select → fill → pay) remains structurally consistent.
- The assistant assists and accelerates the user's own actions — it does not make unauthorized API calls or circumvent IRCTC's rate limiting or queue system.
