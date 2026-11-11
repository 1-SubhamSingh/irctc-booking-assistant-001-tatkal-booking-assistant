// Arm/Disarm button component - controls booking activation

import { sendMessageToBackground } from '../../shared/messaging';
import { getSelectedTemplateId } from './template-manager';

let isArmed = false;

export function initArmButton(): void {
  const armBtn = document.getElementById('arm-btn') as HTMLButtonElement;
  if (!armBtn) return;

  armBtn.addEventListener('click', toggleArm);
  updateArmButton();

  const testBtn = document.getElementById('test-now-btn') as HTMLButtonElement;
  if (testBtn) {
    testBtn.addEventListener('click', testNow);
  }
}

async function toggleArm(): Promise<void> {
  if (isArmed) {
    await disarm();
  } else {
    await armBooking();
  }
}

async function armBooking(): Promise<void> {
  const templateId = getSelectedTemplateId();
  if (!templateId) {
    showArmStatus('Select a template first', 'error');
    return;
  }

  const response = await sendMessageToBackground({
    type: 'ARM_BOOKING',
    payload: { templateId },
  });

  if (response.success) {
    isArmed = true;
    updateArmButton();
    showArmStatus('Booking armed! Will trigger at 10:00:00 AM', 'success');
  } else {
    showArmStatus(`Failed to arm: ${response.error}`, 'error');
  }
}

async function disarm(): Promise<void> {
  const response = await sendMessageToBackground({
    type: 'DISARM_BOOKING',
  });

  if (response.success) {
    isArmed = false;
    updateArmButton();
    showArmStatus('Booking disarmed', 'success');
  }
}

function updateArmButton(): void {
  const armBtn = document.getElementById('arm-btn') as HTMLButtonElement;
  if (!armBtn) return;

  if (isArmed) {
    armBtn.textContent = '🔴 DISARM BOOKING';
    armBtn.className = 'arm-btn armed';
  } else {
    armBtn.textContent = '🟢 ARM BOOKING';
    armBtn.className = 'arm-btn disarmed';
  }
}

function showArmStatus(message: string, type: 'success' | 'error'): void {
  const statusEl = document.getElementById('arm-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-msg ${type}`;
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 5000);
}

export function setArmedState(armed: boolean): void {
  isArmed = armed;
  updateArmButton();
}

async function testNow(): Promise<void> {
  const response = await sendMessageToBackground({
    type: 'TEST_NOW',
  });

  if (response.success) {
    showArmStatus('Test started! Check your IRCTC tab.', 'success');
  } else {
    showArmStatus(response.error ?? 'Test failed', 'error');
  }
}
