// Session recovery - handles session expiration and re-authentication

import { IRCTC_URLS } from '../shared/constants';
import type { ExtensionResponse } from '../shared/types';

export interface RecoveryAction {
  type: 'RELOAD' | 'RE_LOGIN' | 'NAVIGATE' | 'ABORT';
  url?: string;
}

export function determineRecoveryAction(errorType: string, currentUrl: string): RecoveryAction {
  switch (errorType) {
    case 'SESSION_EXPIRED':
      return { type: 'RE_LOGIN', url: IRCTC_URLS.LOGIN };

    case 'SERVICE_UNAVAILABLE':
    case 'TIMEOUT':
      return { type: 'RELOAD' };

    case 'NO_SEATS':
    case 'DUPLICATE_BOOKING':
      return { type: 'ABORT' };

    case 'PAYMENT_FAILED':
      return { type: 'NAVIGATE', url: IRCTC_URLS.BOOKING };

    default:
      return { type: 'RELOAD' };
  }
}

export async function executeRecovery(action: RecoveryAction, tabId: number): Promise<ExtensionResponse> {
  try {
    switch (action.type) {
      case 'RELOAD':
        await chrome.tabs.reload(tabId);
        return { success: true, data: { action: 'RELOAD' } };

      case 'RE_LOGIN':
        await chrome.tabs.update(tabId, { url: action.url ?? IRCTC_URLS.LOGIN });
        return { success: true, data: { action: 'RE_LOGIN' } };

      case 'NAVIGATE':
        if (action.url) {
          await chrome.tabs.update(tabId, { url: action.url });
        }
        return { success: true, data: { action: 'NAVIGATE' } };

      case 'ABORT':
        return { success: false, error: 'Unrecoverable error - booking aborted' };

      default:
        return { success: false, error: 'Unknown recovery action' };
    }
  } catch (e) {
    return { success: false, error: `Recovery failed: ${(e as Error).message}` };
  }
}

export async function checkSessionHealth(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'CHECK_SESSION' });
    return response?.success ?? false;
  } catch {
    return false;
  }
}
