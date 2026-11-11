// Popup entry point with tab switching and unlock logic

import { sendMessageToBackground } from '../shared/messaging';
import { initSettings } from './components/settings';
import { initJourneyForm } from './components/journey-form';
import { initPassengerForm } from './components/passenger-form';
import { initTemplateManager } from './components/template-manager';
import { initStatus } from './components/status';
import { initArmButton } from './components/arm-button';

let masterPassword: string = '';

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  setupTabs();
});

async function checkExistingSession(): Promise<void> {
  // Check if already unlocked in this browser session
  const result = await chrome.storage.session.get('unlocked');
  if (result.unlocked) {
    masterPassword = result.unlocked;
    showMainScreen();
  } else {
    setupUnlock();
  }
}

function setupUnlock(): void {
  const unlockBtn = document.getElementById('unlock-btn')!;
  const passwordInput = document.getElementById('master-password') as HTMLInputElement;
  const errorEl = document.getElementById('unlock-error')!;

  unlockBtn.addEventListener('click', async () => {
    const password = passwordInput.value.trim();
    if (!password) {
      showError(errorEl, 'Please enter a password');
      return;
    }

    const response = await sendMessageToBackground({
      type: 'UNLOCK',
      payload: { masterPassword: password },
    });

    if (response.success) {
      masterPassword = password;
      // Remember unlock state for this browser session (survives popup close)
      await chrome.storage.session.set({ unlocked: password });
      showMainScreen();
    } else {
      showError(errorEl, response.error ?? 'Invalid password');
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockBtn.click();
  });
}

function showMainScreen(): void {
  document.getElementById('unlock-screen')!.classList.add('hidden');
  document.getElementById('unlock-screen')!.classList.remove('active');
  document.getElementById('main-screen')!.classList.remove('hidden');
  document.getElementById('main-screen')!.classList.add('active');

  // Initialize all components
  initSettings(masterPassword);
  initTemplateManager(masterPassword);
  initJourneyForm();
  initPassengerForm();
  initStatus();
  initArmButton();
}

function setupTabs(): void {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = (tab as HTMLElement).dataset.tab!;

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => {
        c.classList.remove('active');
        c.classList.add('hidden');
      });

      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.classList.remove('hidden');
      }
    });
  });
}

function showError(el: HTMLElement, message: string): void {
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

export function getMasterPassword(): string {
  return masterPassword;
}
