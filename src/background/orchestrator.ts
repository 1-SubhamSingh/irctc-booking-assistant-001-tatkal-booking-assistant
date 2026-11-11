// Booking orchestrator - state machine that coordinates the entire booking flow

import { sendMessageToBackground } from '../shared/messaging';
import type { BookingTemplate, BookingSession, ExtensionResponse, PageType } from '../shared/types';

export type OrchestratorState =
  | 'IDLE'
  | 'ARMED'
  | 'LOGGING_IN'
  | 'SEARCHING'
  | 'SELECTING_TRAIN'
  | 'FILLING_PASSENGERS'
  | 'REVIEWING_BOOKING'
  | 'SOLVING_CAPTCHA'
  | 'PAYING'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED';

export interface OrchestratorContext {
  state: OrchestratorState;
  template: BookingTemplate | null;
  credentials: { username: string; password: string } | null;
  captchaApiKey: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startTime: number | null;
}

const ctx: OrchestratorContext = {
  state: 'IDLE',
  template: null,
  credentials: null,
  captchaApiKey: null,
  attempts: 0,
  maxAttempts: 3,
  lastError: null,
  startTime: null,
};

export function getOrchestratorState(): OrchestratorContext {
  return { ...ctx };
}

export function arm(template: BookingTemplate, credentials: { username: string; password: string }, captchaApiKey: string | null): void {
  ctx.state = 'ARMED';
  ctx.template = template;
  ctx.credentials = credentials;
  ctx.captchaApiKey = captchaApiKey;
  ctx.attempts = 0;
  ctx.lastError = null;
  ctx.startTime = null;

  broadcastStatus('Booking armed and ready');
}

export function disarm(): void {
  ctx.state = 'IDLE';
  ctx.template = null;
  ctx.credentials = null;
  ctx.captchaApiKey = null;
  ctx.startTime = null;

  broadcastStatus('Booking disarmed');
}

export async function startBooking(): Promise<void> {
  if (ctx.state !== 'ARMED') return;

  ctx.startTime = Date.now();
  ctx.state = 'LOGGING_IN';
  broadcastStatus('Starting booking - logging in...');

  // Send login command to content script
  const response = await sendToContent({
    action: 'LOGIN',
    payload: ctx.credentials,
  });

  if (!response.success) {
    handleError('Login failed: ' + response.error);
  }
}

export async function onPageChanged(pageType: PageType): Promise<void> {
  switch (pageType) {
    case 'LOGIN':
      if (ctx.state === 'LOGGING_IN' || ctx.state === 'ARMED') {
        // Re-attempt login
        await sendToContent({ action: 'LOGIN', payload: ctx.credentials });
      }
      break;

    case 'SEARCH':
      if (ctx.state === 'LOGGING_IN' || ctx.state === 'SEARCHING') {
        ctx.state = 'SEARCHING';
        broadcastStatus('Logged in - searching for train...');
        await sendToContent({
          action: 'SEARCH',
          payload: {
            source: ctx.template!.journey.sourceStation,
            destination: ctx.template!.journey.destinationStation,
            date: ctx.template!.journey.journeyDate,
            classType: ctx.template!.journey.classType,
            quota: ctx.template!.journey.quotaType,
          },
        });
      }
      break;

    case 'TRAIN_LIST':
      if (ctx.state === 'SEARCHING' || ctx.state === 'SELECTING_TRAIN') {
        ctx.state = 'SELECTING_TRAIN';
        broadcastStatus('Selecting train...');
        await sendToContent({
          action: 'SELECT_TRAIN',
          payload: {
            trainNumber: ctx.template!.journey.trainNumber,
            classType: ctx.template!.journey.classType,
          },
        });
      }
      break;

    case 'PASSENGER_FORM':
      if (ctx.state === 'SELECTING_TRAIN' || ctx.state === 'FILLING_PASSENGERS') {
        ctx.state = 'FILLING_PASSENGERS';
        broadcastStatus('Filling passenger details...');
        await sendToContent({
          action: 'FILL_PASSENGERS',
          payload: {
            passengers: ctx.template!.passengers,
            mobile: '', // Loaded from credentials
            autoUpgrade: true,
            travelInsurance: false,
          },
        });
      }
      break;

    case 'REVIEW_BOOKING':
      ctx.state = 'REVIEWING_BOOKING';
      broadcastStatus('Waiting for CAPTCHA on review page...');
      await sendToContent({ action: 'REVIEW_BOOKING' });
      break;

    case 'PAYMENT':
      ctx.state = 'PAYING';
      broadcastStatus('Processing payment via e-Wallet...');
      await sendToContent({ action: 'PAY' });
      break;

    case 'CONFIRMATION':
      ctx.state = 'COMPLETED';
      const elapsed = ctx.startTime ? ((Date.now() - ctx.startTime) / 1000).toFixed(1) : '?';
      broadcastStatus(`Booking confirmed in ${elapsed}s!`);
      break;

    case 'ERROR':
      handleError('IRCTC error page detected');
      break;
  }
}

export function onCaptchaDetected(): void {
  ctx.state = 'SOLVING_CAPTCHA';
  broadcastStatus('Solving CAPTCHA...');
}

export function onCaptchaSolved(): void {
  // Return to previous state flow
  broadcastStatus('CAPTCHA solved - continuing...');
}

function handleError(error: string): void {
  ctx.attempts++;
  ctx.lastError = error;

  if (ctx.attempts < ctx.maxAttempts) {
    broadcastStatus(`Error: ${error}. Retrying (${ctx.attempts}/${ctx.maxAttempts})...`);
    // Retry will be handled by retry-handler module
  } else {
    ctx.state = 'FAILED';
    broadcastStatus(`Booking failed after ${ctx.maxAttempts} attempts: ${error}`);
  }
}

async function sendToContent(message: { action: string; payload?: unknown }): Promise<ExtensionResponse> {
  try {
    const [tab] = await chrome.tabs.query({ url: '*://*.irctc.co.in/*', active: true });
    if (!tab?.id) {
      return { success: false, error: 'No IRCTC tab found' };
    }
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

function broadcastStatus(message: string): void {
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    payload: {
      state: ctx.state,
      message,
      timestamp: Date.now(),
      attempts: ctx.attempts,
    },
  }).catch(() => {
    // Popup might not be open
  });
}
