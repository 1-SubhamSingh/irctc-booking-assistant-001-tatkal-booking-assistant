// Unlock screen logic - master password verification

import { sendMessageToBackground } from '../../shared/messaging';

export function initUnlock(onSuccess: (password: string) => void): void {
  const form = document.getElementById('unlock-form') as HTMLFormElement;
  const input = document.getElementById('master-password') as HTMLInputElement;
  const error = document.getElementById('unlock-error')!;
  const setupForm = document.getElementById('setup-form') as HTMLFormElement;

  // Check if first time setup
  chrome.storage.local.get('passwordHash', (result) => {
    if (!result.passwordHash) {
      // First time - show setup
      document.getElementById('unlock-screen')!.classList.remove('active');
      document.getElementById('setup-screen')!.classList.add('active');
      initSetup(onSuccess);
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    if (!password) return;

    const response = await sendMessageToBackground({
      type: 'UNLOCK',
      payload: { password },
    });

    if (response.success) {
      error.classList.add('hidden');
      onSuccess(password);
    } else {
      error.textContent = 'Incorrect password';
      error.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  });
}

function initSetup(onSuccess: (password: string) => void): void {
  const form = document.getElementById('setup-form') as HTMLFormElement;
  const input = document.getElementById('new-password') as HTMLInputElement;
  const confirm = document.getElementById('confirm-password') as HTMLInputElement;
  const error = document.getElementById('setup-error')!;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    const confirmVal = confirm.value;

    if (password.length < 8) {
      error.textContent = 'Password must be at least 8 characters';
      error.classList.remove('hidden');
      return;
    }

    if (password !== confirmVal) {
      error.textContent = 'Passwords do not match';
      error.classList.remove('hidden');
      return;
    }

    const response = await sendMessageToBackground({
      type: 'SAVE_CREDENTIALS',
      payload: { masterPassword: password, setup: true },
    });

    if (response.success) {
      onSuccess(password);
    }
  });
}
