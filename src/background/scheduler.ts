// Scheduler - manages alarms for auto-login at 09:59:50 and booking trigger at 10:00:00

import { TIMING } from '../shared/constants';
import { getAccurateTime, scheduleAtExactTime, syncNtpTime } from './ntp-sync';
import { arm, startBooking, getOrchestratorState } from './orchestrator';

const ALARM_NTP_SYNC = 'ntp-sync';
const ALARM_AUTO_LOGIN = 'auto-login';
const ALARM_BOOKING_TRIGGER = 'booking-trigger';

export function setupScheduler(): void {
  // NTP sync every 5 minutes when armed
  chrome.alarms.onAlarm.addListener(handleAlarm);
}

export async function armScheduler(): Promise<void> {
  // Start NTP sync immediately
  await syncNtpTime();

  // Set periodic NTP sync
  chrome.alarms.create(ALARM_NTP_SYNC, {
    periodInMinutes: 5,
  });

  // Schedule auto-login at 09:59:50
  const loginTime = getNextTatkalLoginTime();
  if (loginTime) {
    chrome.alarms.create(ALARM_AUTO_LOGIN, {
      when: loginTime,
    });
  }

  // Schedule booking trigger at exactly 10:00:00.000
  const bookingTime = getNextTatkalTime();
  if (bookingTime) {
    chrome.alarms.create(ALARM_BOOKING_TRIGGER, {
      when: bookingTime,
    });
  }
}

export function disarmScheduler(): void {
  chrome.alarms.clear(ALARM_NTP_SYNC);
  chrome.alarms.clear(ALARM_AUTO_LOGIN);
  chrome.alarms.clear(ALARM_BOOKING_TRIGGER);
}

async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  switch (alarm.name) {
    case ALARM_NTP_SYNC:
      await syncNtpTime();
      break;

    case ALARM_AUTO_LOGIN:
      await handleAutoLoginAlarm();
      break;

    case ALARM_BOOKING_TRIGGER:
      await handleBookingTriggerAlarm();
      break;
  }
}

async function handleAutoLoginAlarm(): Promise<void> {
  const state = getOrchestratorState();
  if (state.state !== 'ARMED') return;

  // Open IRCTC and navigate to login
  const tab = await getOrCreateIrctcTab();
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'LOGIN',
      payload: state.credentials,
    });
  }
}

async function handleBookingTriggerAlarm(): Promise<void> {
  const state = getOrchestratorState();
  if (state.state !== 'ARMED' && state.state !== 'LOGGING_IN') return;

  // Use precise timing with NTP-synced clock
  scheduleAtExactTime(TIMING.AC_TATKAL_HOUR, TIMING.AC_TATKAL_MINUTE, 0, async () => {
    await startBooking();
  });
}

function getNextTatkalTime(): number | null {
  const now = new Date();
  const target = new Date(now);
  target.setHours(TIMING.AC_TATKAL_HOUR, TIMING.AC_TATKAL_MINUTE, 0, 0);

  // If we're past 10:00 today, it's for tomorrow
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime();
}

function getNextTatkalLoginTime(): number | null {
  const tatkalTime = getNextTatkalTime();
  if (!tatkalTime) return null;
  // Login 10 seconds before
  return tatkalTime - TIMING.LOGIN_OFFSET_MS;
}

async function getOrCreateIrctcTab(): Promise<chrome.tabs.Tab | null> {
  const [existing] = await chrome.tabs.query({ url: '*://*.irctc.co.in/*' });
  if (existing) return existing;

  return chrome.tabs.create({
    url: 'https://www.irctc.co.in/nget/train-search',
    active: true,
  });
}
