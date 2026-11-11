// CAPTCHA detector - finds and extracts CAPTCHA images from IRCTC pages

import { SELECTORS } from '../shared/constants';

export interface CaptchaInfo {
  imageData: string; // base64 encoded
  inputSelector: string;
  submitSelector: string;
  type: 'login' | 'booking';
}

export function detectCaptcha(): CaptchaInfo | null {
  // Login CAPTCHA
  const loginCaptcha = document.querySelector(SELECTORS.LOGIN_CAPTCHA_IMG) as HTMLImageElement;
  if (loginCaptcha && isVisible(loginCaptcha)) {
    const imageData = extractCaptchaImage(loginCaptcha);
    if (imageData) {
      return {
        imageData,
        inputSelector: SELECTORS.LOGIN_CAPTCHA_INPUT,
        submitSelector: SELECTORS.LOGIN_SUBMIT,
        type: 'login',
      };
    }
  }

  // Booking/payment CAPTCHA
  const bookingCaptcha = document.querySelector(SELECTORS.BOOKING_CAPTCHA_IMG) as HTMLImageElement;
  if (bookingCaptcha && isVisible(bookingCaptcha)) {
    const imageData = extractCaptchaImage(bookingCaptcha);
    if (imageData) {
      return {
        imageData,
        inputSelector: SELECTORS.BOOKING_CAPTCHA_INPUT,
        submitSelector: SELECTORS.PASSENGER_SUBMIT,
        type: 'booking',
      };
    }
  }

  return null;
}

function extractCaptchaImage(img: HTMLImageElement): string | null {
  try {
    // If it's a data URL already
    if (img.src.startsWith('data:')) {
      return img.src.split(',')[1];
    }

    // Draw to canvas to extract base64
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1];
  } catch (e) {
    // CORS might block canvas extraction
    // Fall back to fetching the image directly
    return null;
  }
}

export async function extractCaptchaViaFetch(imgSrc: string): Promise<string | null> {
  try {
    const response = await fetch(imgSrc, { credentials: 'include' });
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
}

export function fillCaptchaAndSubmit(captchaText: string, inputSelector: string, submitSelector: string): void {
  const input = document.querySelector(inputSelector) as HTMLInputElement;
  if (input) {
    input.value = captchaText;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Small delay before submit
  setTimeout(() => {
    const submitBtn = document.querySelector(submitSelector) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.click();
    }
  }, 100);
}
