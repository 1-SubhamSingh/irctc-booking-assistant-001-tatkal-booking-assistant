// Content script entry point - injected into IRCTC pages
// Detects current page type and dispatches appropriate automator

import { onMessage, sendMessageToBackground } from '../shared/messaging';
import { SELECTORS } from '../shared/constants';
import type { ExtensionMessage, ExtensionResponse, PageType } from '../shared/types';
import { handleLogin } from './pages/login';
import { handleSearch } from './pages/search';
import { handleTrainSelect } from './pages/train-select';
import { handlePassengerForm } from './pages/passenger';
import { handleReviewBooking } from './pages/review-booking';
import { handlePayment } from './pages/payment';

let currentPage: PageType = 'UNKNOWN';

function detectPageType(): PageType {
  const url = window.location.href;
  const body = document.body?.innerHTML ?? '';

  if (document.querySelector(SELECTORS.LOGIN_USERNAME) && document.querySelector(SELECTORS.LOGIN_PASSWORD)) {
    return 'LOGIN';
  }
  if (document.querySelector(SELECTORS.SEARCH_SOURCE) || url.includes('train-search')) {
    if (document.querySelector(SELECTORS.TRAIN_LIST_CONTAINER)) {
      return 'TRAIN_LIST';
    }
    return 'SEARCH';
  }
  if (document.querySelector(SELECTORS.PASSENGER_NAME) || url.includes('psgninput')) {
    return 'PASSENGER_FORM';
  }
  if (url.includes('reviewBooking') || document.querySelector(SELECTORS.REVIEW_CAPTCHA_INPUT)) {
    return 'REVIEW_BOOKING';
  }
  if (document.querySelector(SELECTORS.PAYMENT_WALLET) || document.querySelector(SELECTORS.PAYMENT_WALLET_RADIO) || url.includes('payment')) {
    return 'PAYMENT';
  }
  if (document.querySelector(SELECTORS.CONFIRMATION_PNR) || url.includes('confirm')) {
    return 'CONFIRMATION';
  }
  if (document.querySelector(SELECTORS.ERROR_OVERLAY) || body.includes('try again') || body.includes('heavy traffic')) {
    return 'ERROR';
  }

  return 'UNKNOWN';
}

function notifyPageChange(pageType: PageType): void {
  if (pageType !== currentPage) {
    currentPage = pageType;
    sendMessageToBackground({
      type: 'PAGE_CHANGED',
      payload: { url: window.location.href, pageType },
    });
  }
}

// Set up MutationObserver to detect dynamic page changes (Angular SPA)
const observer = new MutationObserver(() => {
  const detected = detectPageType();
  notifyPageChange(detected);
});

function init(): void {
  console.log('[TBA-Content] Content script initialized on:', window.location.href);
  // Initial page detection
  const initialPage = detectPageType();
  console.log('[TBA-Content] Detected page type:', initialPage);
  notifyPageChange(initialPage);

  // Observe DOM mutations for SPA navigation
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  // Listen for messages from background
  onMessage(async (message: ExtensionMessage): Promise<ExtensionResponse> => {
    console.log('[TBA-Content] Received message:', message.type, message.payload);
    switch (message.type) {
      case 'START_LOGIN':
        return handleLogin(message.payload as any);

      case 'START_SEARCH':
        return handleSearch(message.payload as any);

      case 'SELECT_TRAIN':
        return handleTrainSelect(message.payload as any);

      case 'FILL_PASSENGERS':
        return handlePassengerForm(message.payload as any);

      case 'REVIEW_BOOKING':
        return handleReviewBooking();

      case 'SELECT_PAYMENT':
        return handlePayment();

      case 'SOLVE_CAPTCHA':
        return handleCaptchaExtraction();

      case 'FILL_CAPTCHA':
        return handleCaptchaFill(message.payload as { solution: string });

      case 'CLICK_SUBMIT':
        return handleClickSubmit(message.payload as { buttonSelector?: string });

      default:
        return { success: false, error: `Unknown content script message: ${message.type}` };
    }
  });
}

async function handleCaptchaExtraction(): Promise<ExtensionResponse> {
  const captchaImg = document.querySelector(SELECTORS.BOOKING_CAPTCHA_IMG) as HTMLImageElement
    ?? document.querySelector(SELECTORS.LOGIN_CAPTCHA_IMG) as HTMLImageElement;

  if (!captchaImg) {
    return { success: false, error: 'CAPTCHA image not found' };
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = captchaImg.naturalWidth || captchaImg.width;
    canvas.height = captchaImg.naturalHeight || captchaImg.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(captchaImg, 0, 0);
    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

    return {
      success: true,
      data: { imageBase64, inputSelector: SELECTORS.BOOKING_CAPTCHA_INPUT },
    };
  } catch (e) {
    return { success: false, error: `CAPTCHA extraction failed: ${(e as Error).message}` };
  }
}

function handleCaptchaFill(payload: { solution: string }): ExtensionResponse {
  const input = document.querySelector(SELECTORS.BOOKING_CAPTCHA_INPUT) as HTMLInputElement
    ?? document.querySelector(SELECTORS.LOGIN_CAPTCHA_INPUT) as HTMLInputElement;

  if (!input) {
    return { success: false, error: 'CAPTCHA input not found' };
  }

  setInputValue(input, payload.solution);
  return { success: true };
}

function handleClickSubmit(payload: { buttonSelector?: string }): ExtensionResponse {
  const selector = payload.buttonSelector ?? 'button[type="submit"]';
  const btn = document.querySelector(selector) as HTMLButtonElement;

  if (!btn) {
    return { success: false, error: `Submit button not found: ${selector}` };
  }

  btn.click();
  return { success: true };
}

// Utility: Set input value and trigger Angular change detection
export function setInputValue(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  // Focus the input first - Angular needs this
  input.focus();
  input.dispatchEvent(new Event('focus', { bubbles: true }));

  const nativeValueSetter = input instanceof HTMLSelectElement
    ? Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
    : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

  // Clear existing value
  nativeValueSetter?.call(input, '');
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContent' }));

  // Set value using native setter (bypasses Angular's getter override)
  nativeValueSetter?.call(input, value);

  // Dispatch InputEvent (not just Event) - Angular's DefaultValueAccessor listens for this
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Also trigger keyup for any keyup-based validation
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));

  // Blur to trigger onTouched for form validation
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  console.log(`[TBA-Login] Set value for ${input.getAttribute('formcontrolname') || input.name}: length=${value.length}`);
}

export function waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      obs.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
