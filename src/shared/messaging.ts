// Extension messaging layer: popup ↔ background ↔ content script

import type { ExtensionMessage, ExtensionResponse } from './types';

export function sendMessageToBackground(message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { success: false, error: 'No response from background' });
      }
    });
  });
}

export function sendMessageToContentScript(tabId: number, message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: ExtensionResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { success: false, error: 'No response from content script' });
      }
    });
  });
}

export function onMessage(handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => Promise<ExtensionResponse> | ExtensionResponse): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    const result = handler(message, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // Keep channel open for async response
    }
    sendResponse(result);
    return false;
  });
}

export function broadcastToPopup(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may not be open, ignore errors
  });
}

export async function getActiveIrctcTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({
    url: ['https://www.irctc.co.in/*', 'https://irctc.co.in/*'],
    active: true,
  });
  return tabs[0] ?? null;
}

export async function getOrCreateIrctcTab(): Promise<chrome.tabs.Tab> {
  const existing = await getActiveIrctcTab();
  if (existing) return existing;

  // Try finding any IRCTC tab
  const allIrctcTabs = await chrome.tabs.query({
    url: ['https://www.irctc.co.in/*', 'https://irctc.co.in/*'],
  });
  if (allIrctcTabs[0]) return allIrctcTabs[0];

  // Create new tab
  return chrome.tabs.create({ url: 'https://www.irctc.co.in/nget/train-search', active: true });
}
