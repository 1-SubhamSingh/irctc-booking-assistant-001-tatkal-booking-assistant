// Chrome storage abstraction with encryption integration

import { encrypt, decrypt } from './crypto';
import type {
  BookingTemplate,
  EncryptedCredentials,
  CaptchaConfig,
  BookingSession,
  AppSettings,
} from './types';

interface StorageSchema {
  credentials: EncryptedCredentials | null;
  captchaConfig: CaptchaConfig | null;
  templates: BookingTemplate[];
  activeSession: BookingSession | null;
  settings: AppSettings | null;
}

const STORAGE_DEFAULTS: StorageSchema = {
  credentials: null,
  captchaConfig: null,
  templates: [],
  activeSession: null,
  settings: null,
};

export async function getStorage<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? STORAGE_DEFAULTS[key]);
    });
  });
}

export async function setStorage<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export async function saveCredentials(username: string, password: string, masterPassword: string): Promise<void> {
  const encUsername = await encrypt(username, masterPassword);
  const encPassword = await encrypt(password, masterPassword);

  const credentials: EncryptedCredentials = {
    encryptedUsername: encUsername.ciphertext,
    encryptedPassword: encPassword.ciphertext,
    salt: encUsername.salt,
    iv: encUsername.iv,
    iterations: encUsername.iterations,
  };

  // Store password encryption params separately since they use different IV
  await setStorage('credentials', credentials);
  // Store password IV separately
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({
      _passwordIv: encPassword.iv,
      _passwordSalt: encPassword.salt,
    }, resolve);
  });
}

export async function loadCredentials(masterPassword: string): Promise<{ username: string; password: string } | null> {
  const credentials = await getStorage('credentials');
  if (!credentials) return null;

  const passwordParams = await new Promise<{ _passwordIv: string; _passwordSalt: string }>((resolve) => {
    chrome.storage.local.get(['_passwordIv', '_passwordSalt'], (result) => {
      resolve(result as { _passwordIv: string; _passwordSalt: string });
    });
  });

  const username = await decrypt(
    credentials.encryptedUsername,
    masterPassword,
    credentials.salt,
    credentials.iv,
    credentials.iterations
  );

  const password = await decrypt(
    credentials.encryptedPassword,
    masterPassword,
    passwordParams._passwordSalt,
    passwordParams._passwordIv,
    credentials.iterations
  );

  return { username, password };
}

export async function saveTemplate(template: BookingTemplate): Promise<void> {
  const templates = await getStorage('templates');
  const existing = templates.findIndex((t) => t.id === template.id);
  if (existing >= 0) {
    templates[existing] = template;
  } else {
    templates.push(template);
  }
  await setStorage('templates', templates);
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const templates = await getStorage('templates');
  const filtered = templates.filter((t) => t.id !== templateId);
  await setStorage('templates', filtered);
}

export async function getTemplates(): Promise<BookingTemplate[]> {
  return getStorage('templates');
}

export async function updateSession(session: Partial<BookingSession>): Promise<void> {
  const current = await getStorage('activeSession');
  await setStorage('activeSession', { ...current, ...session } as BookingSession);
}

export async function clearSession(): Promise<void> {
  await setStorage('activeSession', null);
}
