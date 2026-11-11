// Status component - displays real-time booking progress in popup

import type { StatusUpdate } from '../../background/status-broadcaster';

const STEPS = [
  { id: 'login', label: 'Login' },
  { id: 'search', label: 'Search Train' },
  { id: 'select', label: 'Select Train' },
  { id: 'passengers', label: 'Fill Passengers' },
  { id: 'captcha', label: 'Solve CAPTCHA' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirm', label: 'Confirmation' },
];

const STATE_TO_STEP: Record<string, number> = {
  'IDLE': -1,
  'ARMED': 0,
  'LOGGING_IN': 0,
  'SEARCHING': 1,
  'SELECTING_TRAIN': 2,
  'FILLING_PASSENGERS': 3,
  'SOLVING_CAPTCHA': 4,
  'PAYING': 5,
  'CONFIRMING': 6,
  'COMPLETED': 7,
  'FAILED': -1,
};

export function initStatus(): void {
  renderSteps();
  listenForUpdates();
}

function renderSteps(): void {
  const container = document.getElementById('status-steps');
  if (!container) return;

  container.innerHTML = STEPS.map((step, i) => `
    <div class="status-step" id="step-${step.id}">
      <div class="step-icon pending">${i + 1}</div>
      <div class="step-label">${step.label}</div>
    </div>
  `).join('');
}

function listenForUpdates(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATUS_UPDATE') {
      updateDisplay(message.payload as StatusUpdate);
    }
  });
}

function updateDisplay(update: StatusUpdate): void {
  const currentStep = STATE_TO_STEP[update.state] ?? -1;

  // Update step icons
  STEPS.forEach((step, i) => {
    const el = document.getElementById(`step-${step.id}`);
    if (!el) return;
    const icon = el.querySelector('.step-icon')!;

    icon.className = 'step-icon';
    if (i < currentStep) {
      icon.classList.add('done');
      icon.textContent = '✓';
    } else if (i === currentStep) {
      icon.classList.add('active');
      icon.textContent = String(i + 1);
    } else {
      icon.classList.add('pending');
      icon.textContent = String(i + 1);
    }
  });

  // Update status message
  const msgEl = document.getElementById('status-message');
  if (msgEl) {
    msgEl.textContent = update.message;
    msgEl.className = update.state === 'FAILED' ? 'status-msg error' : 'status-msg success';
  }

  // Update progress bar
  const progressEl = document.getElementById('status-progress') as HTMLProgressElement;
  if (progressEl && update.progress !== undefined) {
    progressEl.value = update.progress;
  }

  // Update elapsed time
  const timeEl = document.getElementById('status-elapsed');
  if (timeEl && update.elapsedMs) {
    timeEl.textContent = `${(update.elapsedMs / 1000).toFixed(1)}s`;
  }
}
