// Settings component - master password, IRCTC credentials, 2Captcha API key

import { sendMessageToBackground } from '../../shared/messaging';

let currentMasterPassword = '';

export function initSettings(masterPassword: string): void {
  currentMasterPassword = masterPassword;
  const container = document.getElementById('settings-container')!;

  container.innerHTML = `
    <h3>IRCTC Credentials</h3>
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="irctc-username" placeholder="IRCTC Username" autocomplete="off">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="irctc-password" placeholder="IRCTC Password" autocomplete="off">
    </div>
    <button id="save-credentials-btn" class="btn-primary">Save Credentials</button>
    <p id="cred-status" class="status-msg hidden"></p>

    <hr>

    <h3>CAPTCHA Service</h3>
    <div class="form-group">
      <label>Provider</label>
      <select id="captcha-provider">
        <option value="2CAPTCHA">2Captcha</option>
        <option value="ANTI_CAPTCHA">Anti-Captcha</option>
      </select>
    </div>
    <div class="form-group">
      <label>API Key</label>
      <input type="password" id="captcha-api-key" placeholder="API Key" autocomplete="off">
    </div>
    <button id="save-captcha-btn" class="btn-primary">Save CAPTCHA Config</button>
    <p id="captcha-status" class="status-msg hidden"></p>
  `;

  document.getElementById('save-credentials-btn')!.addEventListener('click', saveCredentials);
  document.getElementById('save-captcha-btn')!.addEventListener('click', saveCaptchaConfig);
}

async function saveCredentials(): Promise<void> {
  const username = (document.getElementById('irctc-username') as HTMLInputElement).value.trim();
  const password = (document.getElementById('irctc-password') as HTMLInputElement).value;
  const statusEl = document.getElementById('cred-status')!;

  if (!username || !password) {
    showStatus(statusEl, 'Please enter both username and password', 'error');
    return;
  }

  const response = await sendMessageToBackground({
    type: 'SAVE_CREDENTIALS',
    payload: { username, password, masterPassword: currentMasterPassword },
  });

  if (response.success) {
    showStatus(statusEl, 'Credentials saved securely ✓', 'success');
    (document.getElementById('irctc-username') as HTMLInputElement).value = '';
    (document.getElementById('irctc-password') as HTMLInputElement).value = '';
  } else {
    showStatus(statusEl, `Error: ${response.error}`, 'error');
  }
}

async function saveCaptchaConfig(): Promise<void> {
  const provider = (document.getElementById('captcha-provider') as HTMLSelectElement).value;
  const apiKey = (document.getElementById('captcha-api-key') as HTMLInputElement).value.trim();
  const statusEl = document.getElementById('captcha-status')!;

  if (!apiKey) {
    showStatus(statusEl, 'Please enter API key', 'error');
    return;
  }

  const response = await sendMessageToBackground({
    type: 'SAVE_CAPTCHA_CONFIG',
    payload: {
      serviceProvider: provider,
      apiKey,
      maxWaitTime: 20000,
      pollInterval: 2000,
    },
  });

  if (response.success) {
    showStatus(statusEl, 'CAPTCHA config saved ✓', 'success');
  } else {
    showStatus(statusEl, `Error: ${response.error}`, 'error');
  }
}

function showStatus(el: HTMLElement, message: string, type: 'success' | 'error'): void {
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}
