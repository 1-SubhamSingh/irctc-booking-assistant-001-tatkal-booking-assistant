// IRCTC website selectors, URLs, and timing constants

export const IRCTC_URLS = {
  BASE: 'https://www.irctc.co.in',
  LOGIN: 'https://www.irctc.co.in/nget/train-search',
  TRAIN_SEARCH: 'https://www.irctc.co.in/nget/train-search',
  BOOKING: 'https://www.irctc.co.in/nget/booking/train-list',
} as const;

export const SELECTORS = {
  // Login page
  LOGIN_USERNAME: 'input[formcontrolname="userid"]',
  LOGIN_PASSWORD: 'input[formcontrolname="password"]',
  LOGIN_CAPTCHA_IMG: '.captcha-img img, img.captcha-img',
  LOGIN_CAPTCHA_INPUT: 'input[formcontrolname="captcha"], input#captcha',
  LOGIN_SUBMIT: 'button[type="submit"].search_btn, button.login-btn',

  // Train search page
  SEARCH_SOURCE: 'input#origin, input[aria-controls="pr_id_1_list"]',
  SEARCH_DESTINATION: 'input#destination, input[aria-controls="pr_id_2_list"]',
  SEARCH_DATE: 'input#jDate, input.ng-tns-c58-, p-calendar input, input[placeholder*="Date"], input[name="jDate"]',
  SEARCH_CLASS: 'p-dropdown#journeyClass, p-dropdown[formcontrolname="journeyClass"], p-dropdown[id*="class"], select#journeyClass',
  SEARCH_QUOTA: 'p-dropdown#journeyQuota, p-dropdown[formcontrolname="journeyQuota"], p-dropdown[id*="quota"], select#journeyQuota',
  SEARCH_SUBMIT: 'button.search_btn.train_Search, button.search_btn, button[label="Find Trains"]',
  SEARCH_AUTOCOMPLETE_ITEM: 'li.ui-autocomplete-list-item, li[role="option"]',

  // Train list page
  TRAIN_LIST_CONTAINER: '.train-list, app-train-list',
  TRAIN_ITEM: '.form-group.no-pad.col-xs-12',
  TRAIN_NUMBER: '.strong, .train-heading strong',
  TRAIN_CLASS_LINK: 'td.pre-avl, .pre-avl a',
  BOOK_BUTTON: 'button.btnDefault.train_Search, button.book-btn',

  // Passenger form
  PASSENGER_NAME: 'input[formcontrolname="passengerName"], input[placeholder="Name"], input[placeholder*="Name"]',
  PASSENGER_AGE: 'input[formcontrolname="passengerAge"], input[placeholder="Age"], input[placeholder*="Age"]',
  PASSENGER_GENDER: 'select[formcontrolname="passengerGender"], p-dropdown[formcontrolname="passengerGender"], p-dropdown[aria-label*="Gender" i]',
  PASSENGER_BERTH: 'select[formcontrolname="passengerBerthChoice"], p-dropdown[formcontrolname="passengerBerthChoice"], p-dropdown[aria-label*="Berth" i]',
  PASSENGER_ID_TYPE: 'select[formcontrolname="passengerIdType"]',  // Not always visible
  PASSENGER_ID_NUMBER: 'input[formcontrolname="passengerIdNo"]',  // Not always visible
  PASSENGER_FOOD: 'select[formcontrolname="passengerFoodChoice"]',
  ADD_PASSENGER_BTN: 'button.add_psgn, a.add_psgn_btn',
  PASSENGER_MOBILE: 'input[formcontrolname="mobileNumber"]',
  PASSENGER_SUBMIT: 'button.train_Search.btnDefault, button.btnDefault, button[class*="train_Search"]',

  // Review booking page
  REVIEW_CAPTCHA_INPUT: 'input#captcha, input#nlpAnswer, input[name*="captcha" i], input[formcontrolname*="captcha" i], input[placeholder*="Captcha" i]',
  REVIEW_CONTINUE: 'button.train_Search.btnDefault, button.btnDefault, button[type="submit"], input[type="submit"]',

  // Payment page
  PAYMENT_WALLET: 'input[value="IRCTC eWallet"], input[value="WALLET"], label[for*="wallet"], li, div, span',
  PAYMENT_WALLET_RADIO: 'input[name="paymentType"][value="WALLET"]',
  PAYMENT_SUBMIT: 'button.btn.btn-primary.train_Search, button.btnDefault, button[class*="train_Search"], button',

  // Confirmation page
  CONFIRMATION_PNR: '.pnr-num, .booking-pnr, span.WL_BG',
  CONFIRMATION_STATUS: '.booking-status, .cnf-status',

  // Error detection
  ERROR_OVERLAY: '.ui-dialog, .error-modal, .sweet-alert',
  ERROR_MESSAGE: '.alert-danger, .error-text, .ui-dialog-content',
  HEAVY_LOAD_TEXT: '.ui-dialog-content, .sweet-alert-text, .error-overlay',
  SESSION_EXPIRED_TEXT: 'a[href*="login"], .session-expired',

  // CAPTCHA elements (during booking)
  BOOKING_CAPTCHA_IMG: 'img.captcha-img, img[alt*="captcha"]',
  BOOKING_CAPTCHA_INPUT: 'input#captcha, input[name="captcha"], input#nlpAnswer',
} as const;

export const TIMING = {
  AC_TATKAL_HOUR: 10,
  AC_TATKAL_MINUTE: 0,
  NON_AC_TATKAL_HOUR: 11,
  NON_AC_TATKAL_MINUTE: 0,
  LOGIN_OFFSET_MS: 10000, // Login 10 seconds before Tatkal opens
  NTP_SYNC_INTERVAL_MS: 60000, // Re-sync NTP every 60 seconds
  NTP_SYNC_SAMPLES: 5, // Average 5 NTP samples for accuracy
  RETRY_INITIAL_MS: 500, // First retry after 500ms
  RETRY_MAX_MS: 3000, // Max retry interval 3 seconds
  RETRY_MAX_ATTEMPTS: 30, // Max 30 retries
  CAPTCHA_POLL_MS: 2000, // Poll 2Captcha every 2 seconds
  CAPTCHA_MAX_WAIT_MS: 20000, // Max wait 20 seconds for CAPTCHA
  CAPTCHA_MAX_ATTEMPTS: 5, // Max 5 CAPTCHA solve attempts
  DOM_WAIT_MS: 500, // Wait for DOM elements after navigation
  MUTATION_TIMEOUT_MS: 10000, // Max wait for MutationObserver
} as const;

export const NTP_URLS = [
  'https://worldtimeapi.org/api/timezone/Asia/Kolkata',
  'https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata',
] as const;

export const CAPTCHA_API = {
  '2CAPTCHA': {
    SUBMIT_URL: 'https://2captcha.com/in.php',
    RESULT_URL: 'https://2captcha.com/res.php',
  },
  'ANTI_CAPTCHA': {
    SUBMIT_URL: 'https://api.anti-captcha.com/createTask',
    RESULT_URL: 'https://api.anti-captcha.com/getTaskResult',
  },
} as const;

export const IRCTC_VALIDATION = {
  MAX_PASSENGERS_TATKAL: 4,
  MIN_PASSENGER_AGE: 5,
  MAX_PASSENGER_AGE: 125,
  MAX_NAME_LENGTH: 16,
  AADHAAR_PATTERN: /^\d{12}$/,
  PAN_PATTERN: /^[A-Z]{5}\d{4}[A-Z]$/,
  PASSPORT_PATTERN: /^[A-Z]\d{7}$/,
  VOTER_ID_PATTERN: /^[A-Z]{3}\d{7}$/,
  DRIVING_LICENSE_PATTERN: /^[A-Z]{2}\d{2}\s?\d{11}$/,
} as const;
