// Background service worker - handles timers, NTP sync, alarms, and orchestration

import { onMessage, broadcastToPopup } from '../shared/messaging';
import type { ExtensionMessage, ExtensionResponse, BookingSession } from '../shared/types';
import { getStorage, setStorage, saveCredentials, loadCredentials, saveTemplate, updateSession, getTemplates } from '../shared/storage';
import { hashPassword } from '../shared/crypto';
import { syncNtpTime, getAccurateTime } from './ntp-sync';

// Session state - cleared on service worker restart
let sessionMasterPassword: string = '';

// Restore session password if service worker restarts
chrome.storage.session.get('unlocked').then((result) => {
  if (result.unlocked) {
    sessionMasterPassword = result.unlocked;
  }
});

// Initialize alarms and listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('[TBA] Tatkal Booking Assistant installed');
  // Set up periodic NTP sync
  chrome.alarms.create('ntp-sync', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'ntp-sync') {
    await syncNtpTime();
  } else if (alarm.name === 'auto-login') {
    await handleAutoLogin();
  } else if (alarm.name === 'trigger-booking') {
    await handleBookingTrigger();
  }
});

// Message handler
onMessage(async (message: ExtensionMessage): Promise<ExtensionResponse> => {
  switch (message.type) {
    case 'SAVE_CREDENTIALS':
      return handleSaveCredentials(message.payload as { username: string; password: string; masterPassword: string });

    case 'SAVE_TEMPLATE':
      return handleSaveTemplate(message.payload as { template: any });

    case 'SAVE_CAPTCHA_CONFIG':
      return handleSaveCaptchaConfig(message.payload as any);

    case 'ARM_BOOKING':
      return handleArmBooking(message.payload as { templateId: string });

    case 'DISARM_BOOKING':
      return handleDisarmBooking();

    case 'GET_STATUS':
      return handleGetStatus();

    case 'UNLOCK':
      return handleUnlock(message.payload as { masterPassword: string });

    case 'PAGE_CHANGED':
      return handlePageChanged(message.payload as any);

    case 'ERROR_DETECTED':
      return handleErrorDetected(message.payload as any);

    case 'BOOKING_CONFIRMED':
      return handleBookingConfirmed(message.payload as any);

    case 'CAPTCHA_DETECTED':
      return handleCaptchaDetected(message.payload as any);

    case 'TEST_NOW':
      return handleTestNow();

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
});

async function handleSaveCredentials(payload: { username: string; password: string; masterPassword: string }): Promise<ExtensionResponse> {
  try {
    await saveCredentials(payload.username, payload.password, payload.masterPassword);
    const hash = await hashPassword(payload.masterPassword);
    const settings = await getStorage('settings');
    await setStorage('settings', { ...settings, masterPasswordHash: hash } as any);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function handleSaveTemplate(payload: { template: any }): Promise<ExtensionResponse> {
  try {
    await saveTemplate(payload.template);
    return { success: true, data: { templateId: payload.template.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function handleSaveCaptchaConfig(payload: any): Promise<ExtensionResponse> {
  try {
    await setStorage('captchaConfig', payload);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function handleArmBooking(payload: { templateId: string }): Promise<ExtensionResponse> {
  try {
    const templates = await getStorage('templates');
    const template = templates.find((t) => t.id === payload.templateId);
    if (!template) return { success: false, error: 'Template not found' };

    const settings = await getStorage('settings');
    await setStorage('settings', {
      ...settings,
      armed: true,
      activeTemplateId: payload.templateId,
    } as any);

    // Calculate alarm times based on tatkal type
    const tatkalHour = template.journey.tatkalType === 'AC' ? 10 : 11;
    const now = await getAccurateTime();
    const loginTime = new Date(now);
    loginTime.setHours(tatkalHour - 1, 59, 50, 0); // 09:59:50 or 10:59:50

    const triggerTime = new Date(now);
    triggerTime.setHours(tatkalHour, 0, 0, 0); // 10:00:00 or 11:00:00

    // If times are in the past (already passed today), set for tomorrow
    if (loginTime.getTime() <= now.getTime()) {
      loginTime.setDate(loginTime.getDate() + 1);
      triggerTime.setDate(triggerTime.getDate() + 1);
    }

    chrome.alarms.create('auto-login', { when: loginTime.getTime() });
    chrome.alarms.create('trigger-booking', { when: triggerTime.getTime() });

    return {
      success: true,
      data: {
        triggerTime: triggerTime.toISOString(),
        loginTime: loginTime.toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function handleDisarmBooking(): Promise<ExtensionResponse> {
  try {
    await chrome.alarms.clear('auto-login');
    await chrome.alarms.clear('trigger-booking');
    const settings = await getStorage('settings');
    await setStorage('settings', { ...settings, armed: false, activeTemplateId: undefined } as any);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function handleGetStatus(): Promise<ExtensionResponse> {
  const session = await getStorage('activeSession');
  const settings = await getStorage('settings');
  return {
    success: true,
    data: { session, armed: settings?.armed ?? false, ntpOffset: settings?.ntpOffset ?? 0 },
  };
}

async function handleUnlock(payload: { masterPassword: string }): Promise<ExtensionResponse> {
  const settings = await getStorage('settings');
  if (!settings?.masterPasswordHash) {
    // First time setup - save the hash
    const hash = await hashPassword(payload.masterPassword);
    await setStorage('settings', { ...settings, masterPasswordHash: hash } as any);
    sessionMasterPassword = payload.masterPassword;
    await chrome.storage.session.set({ unlocked: payload.masterPassword });
    return { success: true };
  }
  const hash = await hashPassword(payload.masterPassword);
  if (hash !== settings.masterPasswordHash) {
    return { success: false, error: 'Invalid master password' };
  }
  sessionMasterPassword = payload.masterPassword;
  await chrome.storage.session.set({ unlocked: payload.masterPassword });
  return { success: true };
}

async function handleAutoLogin(): Promise<void> {
  broadcastToPopup({ type: 'STATUS_UPDATE', payload: { step: 'LOGGING_IN', message: 'Auto-login initiated...', timestamp: new Date().toISOString() } });
  // Orchestrator will handle the actual login via content script
  const session: BookingSession = {
    id: crypto.randomUUID(),
    journeyId: '',
    status: 'LOGGING_IN',
    currentStep: 'LOGIN',
    retryCount: 0,
    captchaSolveCount: 0,
    startedAt: new Date().toISOString(),
    errorLog: [],
  };
  await updateSession(session);
}

async function handleBookingTrigger(): Promise<void> {
  broadcastToPopup({ type: 'STATUS_UPDATE', payload: { step: 'SEARCHING', message: 'Tatkal window open! Starting booking...', timestamp: new Date().toISOString() } });
  await updateSession({ status: 'SEARCHING', currentStep: 'SEARCH' } as any);
}

async function handlePageChanged(payload: any): Promise<ExtensionResponse> {
  broadcastToPopup({ type: 'STATUS_UPDATE', payload: { step: payload.pageType, message: `Page detected: ${payload.pageType}`, timestamp: new Date().toISOString() } });
  return { success: true };
}

async function handleErrorDetected(payload: any): Promise<ExtensionResponse> {
  const session = await getStorage('activeSession');
  if (session) {
    session.errorLog.push(`${payload.errorType}: ${payload.message}`);
    session.retryCount++;
    await updateSession(session);
  }
  broadcastToPopup({ type: 'STATUS_UPDATE', payload: { step: 'FAILED', message: `Error: ${payload.message}. Retrying...`, timestamp: new Date().toISOString(), retryCount: session?.retryCount } });
  return { success: true };
}

async function handleBookingConfirmed(payload: any): Promise<ExtensionResponse> {
  await updateSession({ status: 'CONFIRMED', pnrNumber: payload.pnr, completedAt: new Date().toISOString() } as any);
  broadcastToPopup({ type: 'BOOKING_RESULT', payload: { success: true, pnr: payload.pnr } });

  // Send browser notification
  chrome.notifications.create('booking-confirmed', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Tatkal Booking Confirmed! 🎉',
    message: `PNR: ${payload.pnr} | Train: ${payload.trainNumber}`,
    priority: 2,
  });

  return { success: true };
}

async function handleCaptchaDetected(payload: any): Promise<ExtensionResponse> {
  broadcastToPopup({ type: 'STATUS_UPDATE', payload: { step: 'SOLVING_CAPTCHA', message: 'CAPTCHA detected, solving...', timestamp: new Date().toISOString() } });
  // CAPTCHA solving will be handled by the orchestrator in Phase 5
  return { success: true };
}

async function handleTestNow(): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-TEST] Test Now triggered');

    if (!sessionMasterPassword) {
      // Try to recover from session storage
      const session = await chrome.storage.session.get('unlocked');
      if (session.unlocked) {
        sessionMasterPassword = session.unlocked;
      } else {
        console.error('[TBA-TEST] No master password in session');
        return { success: false, error: 'Session expired. Close popup, reopen, unlock, then try again.' };
      }
    }

    console.log('[TBA-TEST] Master password available');

    // Decrypt credentials
    const creds = await loadCredentials(sessionMasterPassword);
    if (!creds) {
      console.error('[TBA-TEST] No credentials found');
      return { success: false, error: 'No credentials saved. Go to Settings and save your IRCTC credentials first.' };
    }

    console.log('[TBA-TEST] Credentials decrypted, username:', creds.username);

    // Find existing IRCTC tab or create one
    const [existing] = await chrome.tabs.query({ url: '*://*.irctc.co.in/*' });
    console.log('[TBA-TEST] Existing IRCTC tab:', existing?.id ?? 'none');

    if (existing?.id) {
      // Tab already open - try sending login message
      console.log('[TBA-TEST] Sending START_LOGIN to tab', existing.id);
      try {
        const response = await chrome.tabs.sendMessage(existing.id, {
          type: 'START_LOGIN',
          payload: { username: creds.username, password: creds.password },
        });
        console.log('[TBA-TEST] Content script response:', JSON.stringify(response));
        // After login, proceed to search
        await proceedAfterLogin(existing.id);
        return { success: true, data: response };
      } catch (err: any) {
        console.warn('[TBA-TEST] Direct message failed:', err.message, '— reloading tab');
        await chrome.tabs.reload(existing.id);
        waitForTabAndLogin(existing.id, creds);
        return { success: true, data: { message: 'Reloading IRCTC page, will auto-login after load.' } };
      }
    } else {
      // Create new tab
      console.log('[TBA-TEST] Creating new IRCTC tab');
      const tab = await chrome.tabs.create({ url: 'https://www.irctc.co.in/nget/train-search', active: true });
      if (tab.id) {
        waitForTabAndLogin(tab.id, creds);
      }
      return { success: true, data: { message: 'Opening IRCTC, will auto-login after page loads.' } };
    }
  } catch (e: any) {
    console.error('[TBA-TEST] Error:', e.message);
    return { success: false, error: e.message };
  }
}

function waitForTabAndLogin(tabId: number, creds: { username: string; password: string }): void {
  console.log('[TBA-TEST] Waiting for tab', tabId, 'to finish loading...');
  const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (updatedTabId === tabId && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      console.log('[TBA-TEST] Tab loaded! Waiting 2s for Angular...');
      // Wait for Angular to initialize
      setTimeout(() => {
        console.log('[TBA-TEST] Sending START_LOGIN to tab', tabId);
        chrome.tabs.sendMessage(tabId, {
          type: 'START_LOGIN',
          payload: { username: creds.username, password: creds.password },
        }).then((response) => {
          console.log('[TBA-TEST] Login response:', JSON.stringify(response));
          // After login succeeds, proceed to search
          proceedAfterLogin(tabId);
        }).catch((err) => {
          console.error('[TBA-TEST] Login message FAILED:', err.message);
        });
      }, 2000);
    }
  };
  chrome.tabs.onUpdated.addListener(listener);
}

async function proceedAfterLogin(tabId: number): Promise<void> {
  console.log('[TBA-TEST] Login complete, waiting 3s for page to settle...');
  await new Promise((r) => setTimeout(r, 3000));

  // Load saved template for journey details
  const templates = await getTemplates();
  const template = templates?.[0]; // Use first saved template

  if (!template) {
    console.warn('[TBA-TEST] No booking template saved. Stopping after login.');
    console.log('[TBA-TEST] To continue, save a booking template in Settings > Journey Details.');
    return;
  }

  console.log('[TBA-TEST] Using template:', template.name);
  console.log('[TBA-TEST] Journey:', template.journey.sourceStation, '→', template.journey.destinationStation);

  // Send START_SEARCH to the content script
  try {
    const searchPayload = {
      source: template.journey.sourceStation,
      destination: template.journey.destinationStation,
      date: template.journey.journeyDate,
      classType: template.journey.classType,
      quota: template.journey.quotaType,
    };
    console.log('[TBA-TEST] Sending START_SEARCH with payload:', JSON.stringify(searchPayload));

    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'START_SEARCH',
      payload: searchPayload,
    });
    console.log('[TBA-TEST] Search response:', JSON.stringify(response));

    if (response?.success) {
      console.log('[TBA-TEST] Search submitted! Waiting for train list...');
      // Wait for train list to load, then select train
      await new Promise((r) => setTimeout(r, 5000));
      await proceedToTrainSelection(tabId, template);
    }
  } catch (err: any) {
    console.error('[TBA-TEST] Search message failed:', err.message);
  }
}

async function proceedToTrainSelection(tabId: number, template: any): Promise<void> {
  console.log('[TBA-TEST] Sending SELECT_TRAIN for train:', template.journey.trainNumber);
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'SELECT_TRAIN',
      payload: {
        trainNumber: template.journey.trainNumber,
        classType: template.journey.classType,
        quotaType: template.journey.quotaType,
        journeyDate: template.journey.journeyDate,
      },
    });
    console.log('[TBA-TEST] Train selection response:', JSON.stringify(response));

    if (response?.success) {
      console.log('[TBA-TEST] Train selected! Waiting for passenger page navigation...');
      const passengerPageReady = await waitForTabUrlContains(tabId, '/nget/booking/psgninput', 30000);
      console.log('[TBA-TEST] Passenger page ready:', passengerPageReady);
      await proceedToPassengers(tabId, template);
    }
  } catch (err: any) {
    console.error('[TBA-TEST] Train selection failed:', err.message);
  }
}

async function proceedToPassengers(tabId: number, template: any): Promise<void> {
  console.log('[TBA-TEST] Sending FILL_PASSENGERS');
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'FILL_PASSENGERS',
      payload: { passengers: template.passengers },
    });
    console.log('[TBA-TEST] Passenger form response:', JSON.stringify(response));

    if (response?.success) {
      console.log('[TBA-TEST] Passengers filled! Waiting for review page navigation...');
      const movedFromPassengerPage = await waitForTabUrlNotContains(tabId, '/nget/booking/psgninput', 30000);
      console.log('[TBA-TEST] Moved from passenger page:', movedFromPassengerPage);
      const reviewPageReady = await waitForTabUrlContains(tabId, '/nget/booking/reviewBooking', 30000);
      console.log('[TBA-TEST] Review page ready:', reviewPageReady);
      if (reviewPageReady) {
        await proceedToReviewBooking(tabId);
      } else {
        await proceedToPayment(tabId);
      }
    }
  } catch (err: any) {
    console.error('[TBA-TEST] Passenger fill failed:', err.message);
  }
}

async function proceedToReviewBooking(tabId: number): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[TBA-TEST] Sending REVIEW_BOOKING attempt ${attempt} - enter CAPTCHA manually in the page`);
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'REVIEW_BOOKING',
        payload: {},
      });
      console.log('[TBA-TEST] Review booking response:', JSON.stringify(response));

      if (response?.success) {
        console.log('[TBA-TEST] Review submitted! Waiting for payment page navigation...');
        const paymentPageReady = await waitForTabUrlContains(tabId, '/nget/payment/', 30000);
        console.log('[TBA-TEST] Payment page ready:', paymentPageReady);

        if (paymentPageReady) {
          await proceedToPayment(tabId);
          return;
        }

        console.warn('[TBA-TEST] Payment page not reached. CAPTCHA may be wrong; retrying review step...');
      } else {
        console.warn('[TBA-TEST] Review booking attempt failed:', response?.error);
      }
    } catch (err: any) {
      console.error('[TBA-TEST] Review booking failed:', err.message);
    }
  }

  console.error('[TBA-TEST] Review booking did not reach payment page after retries.');
}

async function proceedToPayment(tabId: number): Promise<void> {
  console.log('[TBA-TEST] Sending SELECT_PAYMENT');
  try {
    const paymentPageReady = await waitForTabUrlContains(tabId, '/nget/payment/', 1000);
    if (!paymentPageReady) {
      console.warn('[TBA-TEST] SELECT_PAYMENT skipped because tab is not on payment page yet');
      return;
    }

    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'SELECT_PAYMENT',
      payload: {},
    });
    console.log('[TBA-TEST] Payment response:', JSON.stringify(response));
    console.log('[TBA-TEST] === BOOKING FLOW COMPLETE ===');
  } catch (err: any) {
    console.error('[TBA-TEST] Payment failed:', err.message);
  }
}

async function waitForTabUrlContains(tabId: number, text: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url?.includes(text)) {
        return true;
      }
    } catch {
      // Ignore transient tab lookup errors while navigating.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function waitForTabUrlNotContains(tabId: number, text: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && !tab.url.includes(text)) {
        return true;
      }
    } catch {
      // Ignore transient tab lookup errors while navigating.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}