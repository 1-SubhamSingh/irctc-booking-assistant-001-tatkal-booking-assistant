// Status broadcaster - sends real-time status updates to popup and notifications

import type { OrchestratorState } from './orchestrator';

export interface StatusUpdate {
  state: OrchestratorState;
  message: string;
  timestamp: number;
  attempts: number;
  elapsedMs?: number;
  progress?: number; // 0-100
}

const statusHistory: StatusUpdate[] = [];
const MAX_HISTORY = 50;

export function broadcastStatus(update: StatusUpdate): void {
  statusHistory.push(update);
  if (statusHistory.length > MAX_HISTORY) {
    statusHistory.shift();
  }

  // Send to popup
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    payload: update,
  }).catch(() => {
    // Popup not open
  });
}

export function getStatusHistory(): StatusUpdate[] {
  return [...statusHistory];
}

export function getLatestStatus(): StatusUpdate | null {
  return statusHistory[statusHistory.length - 1] ?? null;
}

export function clearStatusHistory(): void {
  statusHistory.length = 0;
}

export function createProgressUpdate(state: OrchestratorState, message: string, startTime: number | null, attempts: number): StatusUpdate {
  const progress = calculateProgress(state);
  return {
    state,
    message,
    timestamp: Date.now(),
    attempts,
    elapsedMs: startTime ? Date.now() - startTime : undefined,
    progress,
  };
}

function calculateProgress(state: OrchestratorState): number {
  const progressMap: Record<string, number> = {
    'IDLE': 0,
    'ARMED': 5,
    'LOGGING_IN': 15,
    'SEARCHING': 30,
    'SELECTING_TRAIN': 45,
    'FILLING_PASSENGERS': 60,
    'SOLVING_CAPTCHA': 70,
    'PAYING': 85,
    'CONFIRMING': 95,
    'COMPLETED': 100,
    'FAILED': 0,
  };
  return progressMap[state] ?? 0;
}
