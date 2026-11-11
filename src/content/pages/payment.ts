// Payment page automator - select IRCTC e-Wallet and confirm payment

import { SELECTORS } from '../../shared/constants';
import { waitForElement } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

export async function handlePayment(): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Payment] Starting payment selection');

    // Wait for payment options to load. Current IRCTC URL is /nget/payment/bkgPaymentOptions.
    const paymentContainer = await waitForElement('body', 15000);
    if (!paymentContainer) {
      return { success: false, error: 'Payment page did not load' };
    }

    await delay(500);

    const eWalletOption = findEWalletMethod();
    if (!eWalletOption) {
      return { success: false, error: 'IRCTC e-Wallet option not found' };
    }

    console.log('[TBA-Payment] Selecting e-Wallet method:', eWalletOption.textContent?.trim());
    eWalletOption.click();
    await delay(800);

    const walletProvider = findWalletProvider();
    if (walletProvider) {
      console.log('[TBA-Payment] Selecting wallet provider:', walletProvider.textContent?.trim());
      walletProvider.click();
      await delay(500);
    }

    const payBtn = findPayAndBookButton();
    if (payBtn) {
      console.log('[TBA-Payment] Clicking Pay & Book:', payBtn.textContent?.trim());
      payBtn.click();
      return { success: true, data: { method: 'IRCTC_EWALLET' } };
    }

    return { success: false, error: 'Pay button not found' };
  } catch (e) {
    return { success: false, error: `Payment automation failed: ${(e as Error).message}` };
  }
}

function findEWalletMethod(): HTMLElement | null {
  const radio = document.querySelector(SELECTORS.PAYMENT_WALLET_RADIO) as HTMLElement | null;
  if (radio) return radio;

  const candidates = Array.from(document.querySelectorAll('li, div, span, label, a')) as HTMLElement[];
  return candidates.find((el) => {
    const text = normalizeText(el.textContent ?? '');
    const visible = el.offsetParent !== null;
    const compact = text.length < 120;
    return visible && compact && text.includes('E-WALLET') && text.includes('INSTANT PAYMENT');
  }) ?? candidates.find((el) => {
    const text = normalizeText(el.textContent ?? '');
    return el.offsetParent !== null && text.length < 120 && text.includes('E-WALLET');
  }) ?? null;
}

function findWalletProvider(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('input, label, li, div, span')) as HTMLElement[];
  return candidates.find((el) => {
    const text = normalizeText(el.textContent ?? '');
    const value = normalizeText((el as HTMLInputElement).value ?? '');
    const visible = el.offsetParent !== null;
    const compact = text.length < 180;
    return visible && compact && (text.includes('IRCTC E') || value.includes('EWALLET') || value.includes('WALLET'));
  }) ?? null;
}

function findPayAndBookButton(): HTMLButtonElement | null {
  const candidates = Array.from(document.querySelectorAll(SELECTORS.PAYMENT_SUBMIT)) as HTMLButtonElement[];
  return candidates.find((btn) => {
    const text = normalizeText(btn.textContent ?? btn.value ?? '');
    const visible = btn.offsetParent !== null;
    const enabled = !btn.disabled;
    const negative = text.includes('BACK') || text.includes('CANCEL') || text.includes('RESET');
    const forward = text.includes('PAY') || text.includes('BOOK') || text.includes('PROCEED');
    return visible && enabled && forward && !negative;
  }) ?? null;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}