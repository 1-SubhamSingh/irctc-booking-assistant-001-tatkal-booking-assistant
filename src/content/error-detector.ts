// Error detector - monitors IRCTC pages for errors and session issues

import { SELECTORS } from '../shared/constants';
import type { ErrorType } from '../shared/types';

export interface DetectedError {
  type: ErrorType;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

const ERROR_PATTERNS: Array<{ pattern: RegExp; type: ErrorType; recoverable: boolean }> = [
  { pattern: /session\s*expired/i, type: 'SESSION_EXPIRED', recoverable: true },
  { pattern: /service\s*unavailable|heavy\s*traffic/i, type: 'HEAVY_LOAD', recoverable: true },
  { pattern: /too\s*many\s*request/i, type: 'HEAVY_LOAD', recoverable: true },
  { pattern: /captcha.*incorrect|invalid.*captcha/i, type: 'CAPTCHA_FAILED', recoverable: true },
  { pattern: /seat.*not\s*available|no\s*seats/i, type: 'TRAIN_UNAVAILABLE', recoverable: false },
  { pattern: /payment.*failed|transaction.*failed/i, type: 'NETWORK_ERROR', recoverable: true },
  { pattern: /timeout|timed?\s*out/i, type: 'NETWORK_ERROR', recoverable: true },
  { pattern: /already\s*booked|duplicate/i, type: 'UNKNOWN', recoverable: false },
];

export function detectErrors(): DetectedError | null {
  // Check for error container
  const errorEl = document.querySelector(SELECTORS.ERROR_MESSAGE);
  if (errorEl) {
    const message = errorEl.textContent?.trim() ?? 'Unknown error';
    const classified = classifyError(message);
    return {
      type: classified.type,
      message,
      recoverable: classified.recoverable,
      timestamp: Date.now(),
    };
  }

  // Check for error toast/notification
  const toast = document.querySelector('.ui-toast-message-error, .toast-error, .alert-danger');
  if (toast) {
    const message = toast.textContent?.trim() ?? 'Unknown error';
    const classified = classifyError(message);
    return {
      type: classified.type,
      message,
      recoverable: classified.recoverable,
      timestamp: Date.now(),
    };
  }

  // Check for modal/dialog errors
  const modal = document.querySelector('.modal-body .error, .cdk-overlay-container .error');
  if (modal) {
    const message = modal.textContent?.trim() ?? 'Modal error';
    const classified = classifyError(message);
    return {
      type: classified.type,
      message,
      recoverable: classified.recoverable,
      timestamp: Date.now(),
    };
  }

  return null;
}

function classifyError(message: string): { type: ErrorType; recoverable: boolean } {
  for (const { pattern, type, recoverable } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return { type, recoverable };
    }
  }
  return { type: 'UNKNOWN', recoverable: true };
}

export function setupErrorObserver(onError: (error: DetectedError) => void): MutationObserver {
  const observer = new MutationObserver(() => {
    const error = detectErrors();
    if (error) {
      onError(error);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  return observer;
}

export function dismissErrorDialog(): void {
  // Try to close error modals
  const closeBtn = document.querySelector(
    '.modal .close, .cdk-overlay-container button[aria-label="Close"], .ui-dialog-titlebar-close'
  ) as HTMLElement;
  if (closeBtn) {
    closeBtn.click();
  }
}
