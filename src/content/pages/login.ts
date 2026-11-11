// Login page automator - click login button, fill username, password, handle CAPTCHA, submit

import { SELECTORS } from '../../shared/constants';
import { waitForElement, setInputValue } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

export async function handleLogin(payload: { username: string; password: string }): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Login] Starting login automation...');

    // Step 1: Check if login form is already visible
    let usernameInput = document.querySelector(SELECTORS.LOGIN_USERNAME) as HTMLInputElement;

    if (!usernameInput) {
      // Need to click the LOGIN button first to open the login modal
      console.log('[TBA-Login] Login form not visible, clicking LOGIN button...');
      const loginBtn = document.querySelector(
        'a.search_btn.loginText, a[aria-label="Click here to Login"], a.loginText, ' +
        'a[href*="login"], button.login-btn, a.log_in, ' +
        'li.loginli a, a.dropdown-toggle.login'
      ) as HTMLElement;

      if (!loginBtn) {
        // Try finding by text content
        const allLinks = document.querySelectorAll('a, button');
        let found = false;
        for (const link of allLinks) {
          const text = link.textContent?.trim().toUpperCase() ?? '';
          if (text === 'LOGIN' || text === 'SIGN IN' || text === 'LOG IN') {
            console.log('[TBA-Login] Found login button by text:', text);
            (link as HTMLElement).click();
            found = true;
            break;
          }
        }
        if (!found) {
          return { success: false, error: 'Login button not found on page' };
        }
      } else {
        console.log('[TBA-Login] Clicking login button');
        loginBtn.click();
      }

      // Wait for login form to appear
      await delay(1500);
      usernameInput = await waitForElement(SELECTORS.LOGIN_USERNAME, 10000) as HTMLInputElement;
      if (!usernameInput) {
        return { success: false, error: 'Login form did not appear after clicking LOGIN button' };
      }
    }

    console.log('[TBA-Login] Found username field, filling credentials...');

    // Step 2: Fill credentials - focus + fill with delays like a real user
    usernameInput.click();
    await delay(200);
    setInputValue(usernameInput, payload.username);
    await delay(500);

    const passwordInput = document.querySelector(SELECTORS.LOGIN_PASSWORD) as HTMLInputElement;
    if (!passwordInput) {
      return { success: false, error: 'Password field not found' };
    }
    passwordInput.click();
    await delay(200);
    setInputValue(passwordInput, payload.password);
    await delay(500);

    // Verify values are actually set
    console.log('[TBA-Login] Credentials filled, verifying...');
    console.log('[TBA-Login] Username value length:', usernameInput.value.length);
    console.log('[TBA-Login] Password value length:', passwordInput.value.length);

    if (!usernameInput.value || !passwordInput.value) {
      console.error('[TBA-Login] Values did not stick! Trying alternative method...');
      // Alternative: use Object.getOwnPropertyDescriptor directly
      usernameInput.setAttribute('value', payload.username);
      usernameInput.value = payload.username;
      usernameInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: payload.username, inputType: 'insertText' }));
      passwordInput.setAttribute('value', payload.password);
      passwordInput.value = payload.password;
      passwordInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: payload.password, inputType: 'insertText' }));
      await delay(300);
    }

    // Step 3: Wait for CAPTCHA to appear (IRCTC loads it with a delay)
    await delay(1000);
    const captchaImg = document.querySelector(
      SELECTORS.LOGIN_CAPTCHA_IMG + ', img[class*="captcha"], .login-captcha img, ' +
      '.captcha img, img[alt*="captcha"], img[alt*="nlp"], canvas.captcha'
    ) as HTMLImageElement;

    // Also check for NLP/text-based captcha question
    const nlpCaptcha = document.querySelector(
      'span.nlp-captcha, .captcha-text, label[for*="captcha"], ' +
      'span[class*="caption"], .loginCaptcha, .nlpQues'
    );

    const captchaInput = document.querySelector(
      SELECTORS.LOGIN_CAPTCHA_INPUT + ', input[placeholder*="captcha" i], ' +
      'input[placeholder*="answer" i], input#nlpAnswer, input[name="captcha"]'
    ) as HTMLInputElement;

    if (captchaImg || nlpCaptcha || captchaInput) {
      console.log('[TBA-Login] CAPTCHA detected!', {
        hasImage: !!captchaImg,
        hasNlp: !!nlpCaptcha,
        hasInput: !!captchaInput,
        nlpText: nlpCaptcha?.textContent?.trim(),
      });
      // Notify background to solve CAPTCHA
      return { success: true, data: { captchaRequired: true, nlpText: nlpCaptcha?.textContent?.trim() } };
    }

    // Step 4: No CAPTCHA found — find SIGN IN button inside login modal (not the Search Trains button)
    console.log('[TBA-Login] No CAPTCHA detected, submitting...');

    // Find the login form/modal container that has our username field
    const loginForm = usernameInput.closest('form') || usernameInput.closest('.modal-body, .modal-content, .login-container, .ui-dialog-content, app-login');
    console.log('[TBA-Login] Login form container found:', !!loginForm, loginForm?.tagName, loginForm?.className?.substring(0, 50));

    let submitBtn: HTMLButtonElement | null = null;

    if (loginForm) {
      // Look for submit button INSIDE the login form only
      submitBtn = loginForm.querySelector(
        'button[type="submit"], button.search_btn, button.login_btn, button.login_text'
      ) as HTMLButtonElement;
    }

    // Fallback: find button by text content "SIGN IN" or "LOGIN"
    if (!submitBtn) {
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        const text = btn.textContent?.trim().toUpperCase() ?? '';
        if (text === 'SIGN IN' || text === 'LOGIN' || text === 'LOG IN' || text === 'SUBMIT') {
          // Make sure it's NOT the "Search Trains" button
          if (!text.includes('SEARCH') && !text.includes('TRAIN')) {
            submitBtn = btn as HTMLButtonElement;
            break;
          }
        }
      }
    }

    if (submitBtn) {
      console.log('[TBA-Login] Submit button found:', submitBtn.textContent?.trim());
      submitBtn.click();
      // Wait for response
      await delay(3000);

      // Check for error messages on page
      const errorMsg = document.querySelector(
        '.loginError, .error-message, .alert-danger, p-toast .p-toast-message, ' +
        '.ui-toast-message, .ng-trigger-overlayContentAnimation, .login-error'
      );
      if (errorMsg) {
        console.log('[TBA-Login] Error after submit:', errorMsg.textContent?.trim());
      }

      // Check if CAPTCHA appeared after click
      const captchaAfterSubmit = document.querySelector(
        'img[class*="captcha"], .captcha img, input[placeholder*="captcha" i], ' +
        'input#nlpAnswer, input[name="captcha"], .nlpQues'
      );
      if (captchaAfterSubmit) {
        console.log('[TBA-Login] CAPTCHA appeared after submit attempt');
        return { success: true, data: { captchaRequired: true } };
      }
    } else {
      console.error('[TBA-Login] Sign In button NOT found in login modal!');
      const allBtns = document.querySelectorAll('button');
      allBtns.forEach((btn, i) => {
        console.log(`[TBA-Login] Button[${i}]:`, btn.type, btn.className?.substring(0, 40), `"${btn.textContent?.trim().substring(0, 30)}"`);
      });
    }

    return { success: true, data: { captchaRequired: false } };
  } catch (e) {
    console.error('[TBA-Login] Error:', (e as Error).message);
    return { success: false, error: `Login automation failed: ${(e as Error).message}` };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
