// CAPTCHA solver - 2Captcha API client for solving IRCTC CAPTCHAs

import { CAPTCHA_API, TIMING } from '../shared/constants';

export interface SolveResult {
  success: boolean;
  text?: string;
  error?: string;
  solveTimeMs?: number;
}

export async function solveCaptcha(imageBase64: string, apiKey: string): Promise<SolveResult> {
  const startTime = Date.now();

  try {
    // Step 1: Submit CAPTCHA image
    const taskId = await submitCaptcha(imageBase64, apiKey);
    if (!taskId) {
      return { success: false, error: 'Failed to submit CAPTCHA to solver' };
    }

    // Step 2: Poll for result
    const text = await pollResult(taskId, apiKey);
    if (!text) {
      return { success: false, error: 'CAPTCHA solve timeout' };
    }

    return {
      success: true,
      text,
      solveTimeMs: Date.now() - startTime,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function submitCaptcha(imageBase64: string, apiKey: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('method', 'base64');
  formData.append('body', imageBase64);
  formData.append('json', '1');
  // IRCTC CAPTCHAs are usually 5-6 alphanumeric characters
  formData.append('numeric', '0');
  formData.append('min_len', '5');
  formData.append('max_len', '6');

  const response = await fetch(CAPTCHA_API['2CAPTCHA'].SUBMIT_URL, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (data.status === 1) {
    return data.request; // Task ID
  }

  return null;
}

async function pollResult(taskId: string, apiKey: string): Promise<string | null> {
  const maxAttempts = TIMING.CAPTCHA_MAX_WAIT_MS / TIMING.CAPTCHA_POLL_MS;

  for (let i = 0; i < maxAttempts; i++) {
    await delay(TIMING.CAPTCHA_POLL_MS);

    const url = `${CAPTCHA_API['2CAPTCHA'].RESULT_URL}?key=${encodeURIComponent(apiKey)}&action=get&id=${encodeURIComponent(taskId)}&json=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 1) {
      return data.request; // Solved text
    }

    if (data.request === 'CAPCHA_NOT_READY') {
      continue; // Still processing
    }

    // Error
    return null;
  }

  return null; // Timeout
}

export async function reportIncorrect(taskId: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${CAPTCHA_API['2CAPTCHA'].RESULT_URL}?key=${encodeURIComponent(apiKey)}&action=reportbad&id=${encodeURIComponent(taskId)}&json=1`);
  } catch {
    // Best effort
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
