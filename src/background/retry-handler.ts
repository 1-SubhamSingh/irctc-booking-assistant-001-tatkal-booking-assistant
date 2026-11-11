// Retry handler - exponential backoff retry logic for recoverable errors

import type { ErrorType } from '../shared/types';
import type { DetectedError } from '../content/error-detector';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
};

// Error-specific retry configs
const ERROR_CONFIGS: Partial<Record<ErrorType, RetryConfig>> = {
  'SESSION_EXPIRED': { maxAttempts: 2, baseDelayMs: 500, maxDelayMs: 2000, backoffFactor: 2 },
  'HEAVY_LOAD': { maxAttempts: 3, baseDelayMs: 3000, maxDelayMs: 15000, backoffFactor: 3 },
  'NETWORK_ERROR': { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 10000, backoffFactor: 2 },
  'CAPTCHA_FAILED': { maxAttempts: 5, baseDelayMs: 200, maxDelayMs: 1000, backoffFactor: 1.5 },
};

export interface RetryState {
  attempts: number;
  lastError: DetectedError | null;
  nextRetryAt: number | null;
}

const retryState: RetryState = {
  attempts: 0,
  lastError: null,
  nextRetryAt: null,
};

export function getRetryState(): RetryState {
  return { ...retryState };
}

export function resetRetryState(): void {
  retryState.attempts = 0;
  retryState.lastError = null;
  retryState.nextRetryAt = null;
}

export function shouldRetry(error: DetectedError): boolean {
  if (!error.recoverable) return false;

  const config = ERROR_CONFIGS[error.type] ?? DEFAULT_CONFIG;
  return retryState.attempts < config.maxAttempts;
}

export function getRetryDelay(error: DetectedError): number {
  const config = ERROR_CONFIGS[error.type] ?? DEFAULT_CONFIG;
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffFactor, retryState.attempts),
    config.maxDelayMs
  );
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  errorType: ErrorType = 'UNKNOWN',
): Promise<T> {
  const config = ERROR_CONFIGS[errorType] ?? DEFAULT_CONFIG;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      resetRetryState();
      return result;
    } catch (e) {
      retryState.attempts = attempt + 1;
      retryState.lastError = {
        type: errorType,
        message: (e as Error).message,
        recoverable: true,
        timestamp: Date.now(),
      };

      if (attempt < config.maxAttempts - 1) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffFactor, attempt),
          config.maxDelayMs
        );
        retryState.nextRetryAt = Date.now() + delay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Operation failed after ${config.maxAttempts} attempts`);
}

export function recordAttempt(error: DetectedError): void {
  retryState.attempts++;
  retryState.lastError = error;
  const delay = getRetryDelay(error);
  retryState.nextRetryAt = Date.now() + delay;
}
