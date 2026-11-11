// Review booking page automator - wait for manual CAPTCHA entry, then continue

import { SELECTORS } from '../../shared/constants';
import { waitForElement } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

export async function handleReviewBooking(): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Review] Review booking page detected');

    const captchaInput = await waitForElement(SELECTORS.REVIEW_CAPTCHA_INPUT, 15000) as HTMLInputElement | null;
    if (!captchaInput) {
      return { success: false, error: 'Review CAPTCHA input not found' };
    }

    captchaInput.focus();
    captchaInput.scrollIntoView({ block: 'center', inline: 'nearest' });
    console.log('[TBA-Review] Waiting for manual CAPTCHA entry...');

    const captchaEntered = await waitForCaptchaEntry(captchaInput, 120000);
    if (!captchaEntered) {
      return { success: false, error: 'Timed out waiting for manual CAPTCHA entry' };
    }

    const continueBtn = findContinueButton();
    if (!continueBtn) {
      return { success: false, error: 'Review Continue button not found' };
    }

    console.log('[TBA-Review] CAPTCHA entered, clicking Continue');
    continueBtn.click();
    return { success: true };
  } catch (e) {
    return { success: false, error: `Review booking failed: ${(e as Error).message}` };
  }
}

async function waitForCaptchaEntry(input: HTMLInputElement, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  let lastValue = input.value.trim();
  let lastChangedAt = Date.now();

  while (Date.now() - start < timeoutMs) {
    const value = input.value.trim();
    if (value !== lastValue) {
      lastValue = value;
      lastChangedAt = Date.now();
    }

    // IRCTC CAPTCHA can be 4 or 5 chars. Wait until the user stops typing
    // so a 5-char CAPTCHA is not submitted after only the first 4 chars.
    if (value.length >= 4 && Date.now() - lastChangedAt >= 800) {
      return true;
    }

    await delay(100);
  }

  return false;
}

function findContinueButton(): HTMLButtonElement | null {
  const candidates = Array.from(document.querySelectorAll(SELECTORS.REVIEW_CONTINUE)) as HTMLButtonElement[];

  for (const btn of candidates) {
    const text = (btn.textContent?.trim().toUpperCase() || btn.value?.trim().toUpperCase() || '').replace(/\s+/g, ' ');
    const isVisible = btn.offsetParent !== null;
    const isEnabled = !btn.disabled;
    const isNegative = text.includes('BACK') || text.includes('MODIFY') || text.includes('CANCEL') || text.includes('RESET');
    const isForward = text.includes('CONTINUE') || text.includes('PROCEED') || text.includes('PAY');

    if (isVisible && isEnabled && isForward && !isNegative) {
      return btn;
    }
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}