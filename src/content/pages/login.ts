
import { SELECTORS } from '../../shared/constants';
import { waitForElement, setInputValue } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

interface LoginPayload {
  username: string;
  password: string;
}

const TIMEOUT = {
  loginForm: 8000,
  captcha: 1200,
  loginResponse: 3000,
};

const CAPTCHA_IMAGE_SELECTOR = [
  SELECTORS.LOGIN_CAPTCHA_IMG,
  'img[class*="captcha"]',
  '.login-captcha img',
  '.captcha img',
  'img[alt*="captcha" i]',
  'img[alt*="nlp" i]',
  'canvas.captcha',
].join(', ');

const CAPTCHA_TEXT_SELECTOR = [
  'span.nlp-captcha',
  '.captcha-text',
  'label[for*="captcha"]',
  'span[class*="caption"]',
  '.loginCaptcha',
  '.nlpQues',
].join(', ');

const CAPTCHA_INPUT_SELECTOR = [
  SELECTORS.LOGIN_CAPTCHA_INPUT,
  'input[placeholder*="captcha" i]',
  'input[placeholder*="answer" i]',
  'input#nlpAnswer',
  'input[name="captcha"]',
].join(', ');

const LOGIN_BUTTON_SELECTOR = [
  'a.search_btn.loginText',
  'a[aria-label="Click here to Login"]',
  'a.loginText',
  'a[href*="login"]',
  'button.login-btn',
  'a.log_in',
  'li.loginli a',
  'a.dropdown-toggle.login',
].join(', ');

const SUBMIT_BUTTON_SELECTOR = [
  'button[type="submit"]',
  'button.search_btn',
  'button.login_btn',
  'button.login_text',
].join(', ');

const ERROR_SELECTOR = [
  '.loginError',
  '.error-message',
  '.alert-danger',
  'p-toast .p-toast-message',
  '.ui-toast-message',
  '.login-error',
].join(', ');

function isVisible(element: Element): boolean {
  const html = element as HTMLElement;

  return (
    html.isConnected &&
    html.getClientRects().length > 0 &&
    getComputedStyle(html).visibility !== 'hidden' &&
    getComputedStyle(html).display !== 'none'
  );
}

/**
 * Wait for a DOM condition instead of fixed delays.
 */
function waitForCondition<T>(
  condition: () => T | null | undefined | false,
  timeout = 3000
): Promise<T | null> {
  const initial = condition();

  if (initial) {
    return Promise.resolve(initial as T);
  }

  return new Promise(resolve => {
    const root = document.body;

    if (!root) {
      resolve(null);
      return;
    }

    let finished = false;

    const observer = new MutationObserver(() => {
      check();
    });

    const timer = setTimeout(() => {
      finish(null);
    }, timeout);

    function finish(result: T | null) {
      if (finished) return;

      finished = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(result);
    }

    function check() {
      const result = condition();

      if (result) {
        finish(result as T);
      }
    }

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'disabled',
        'aria-hidden',
        'aria-invalid',
      ],
    });

    // Catch changes between initial check and observer setup.
    check();
  });
}

/**
 * Find login button.
 */
function findLoginButton(): HTMLElement | null {
  const preferred = document.querySelectorAll(
    LOGIN_BUTTON_SELECTOR
  );

  for (const button of preferred) {
    if (isVisible(button)) {
      return button as HTMLElement;
    }
  }

  // Text fallback.
  const elements = document.querySelectorAll('a, button');

  for (const element of elements) {
    const text = element.textContent?.trim().toUpperCase();

    if (
      isVisible(element) &&
      ['LOGIN', 'SIGN IN', 'LOG IN'].includes(text || '')
    ) {
      return element as HTMLElement;
    }
  }

  return null;
}

/**
 * Find visible CAPTCHA elements.
 */
function findCaptcha(): {
  detected: boolean;
  nlpText?: string;
} {
  const captchaImage = Array.from(
    document.querySelectorAll(CAPTCHA_IMAGE_SELECTOR)
  ).some(isVisible);

  const nlpCaptcha = Array.from(
    document.querySelectorAll(CAPTCHA_TEXT_SELECTOR)
  ).find(isVisible);

  const captchaInput = Array.from(
    document.querySelectorAll(CAPTCHA_INPUT_SELECTOR)
  ).some(isVisible);

  const detected = captchaImage || !!nlpCaptcha || captchaInput;

  return {
    detected,
    nlpText: nlpCaptcha?.textContent?.trim() || undefined,
  };
}

/**
 * Locate the login modal containing the username input.
 */
function findLoginContainer(
  usernameInput: HTMLInputElement
): Element | null {
  return (
    usernameInput.closest('form') ||
    usernameInput.closest(
      '.modal-body, .modal-content, .login-container, ' +
      '.ui-dialog-content, app-login'
    )
  );
}

/**
 * Find the actual Sign In button.
 */
function findSubmitButton(
  loginContainer: Element
): HTMLButtonElement | null {
  const preferred = loginContainer.querySelectorAll(
    SUBMIT_BUTTON_SELECTOR
  );

  for (const button of preferred) {
    const btn = button as HTMLButtonElement;

    if (isVisible(btn) && !btn.disabled) {
      return btn;
    }
  }

  // Text fallback, scoped to login container.
  const buttons = loginContainer.querySelectorAll('button');

  for (const button of buttons) {
    const text = button.textContent?.trim().toUpperCase();

    if (
      isVisible(button) &&
      !(button as HTMLButtonElement).disabled &&
      ['SIGN IN', 'LOGIN', 'LOG IN', 'SUBMIT'].includes(text || '')
    ) {
      return button as HTMLButtonElement;
    }
  }

  return null;
}

/**
 * Find visible login errors.
 */
function findLoginError(): string | null {
  const errors = document.querySelectorAll(ERROR_SELECTOR);

  for (const error of errors) {
    if (isVisible(error) && error.textContent?.trim()) {
      return error.textContent.trim();
    }
  }

  return null;
}

/**
 * Main login automation.
 */
export async function handleLogin(
  payload: LoginPayload
): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Login] Starting login automation');

    if (!payload.username || !payload.password) {
      return {
        success: false,
        error: 'Username and password are required',
      };
    }

    // STEP 1: Find login form.
    let usernameInput = document.querySelector(
      SELECTORS.LOGIN_USERNAME
    ) as HTMLInputElement | null;

    // STEP 2: Open login modal if necessary.
    if (!usernameInput || !isVisible(usernameInput)) {
      console.log('[TBA-Login] Opening login modal');

      const loginButton = findLoginButton();

      if (!loginButton) {
        return {
          success: false,
          error: 'Login button not found on page',
        };
      }

      loginButton.click();

      usernameInput = await waitForCondition(
        () => {
          const input = document.querySelector(
            SELECTORS.LOGIN_USERNAME
          ) as HTMLInputElement | null;

          return input && isVisible(input) ? input : null;
        },
        TIMEOUT.loginForm
      );

      if (!usernameInput) {
        return {
          success: false,
          error: 'Login form did not appear after clicking LOGIN',
        };
      }
    }

    console.log('[TBA-Login] Login form found');

    // STEP 3: Fill username.
    usernameInput.focus();
    setInputValue(usernameInput, payload.username);

    // Verify username.
    if (usernameInput.value !== payload.username) {
      return {
        success: false,
        error: 'Could not populate username field',
      };
    }

    // STEP 4: Fill password.
    const passwordInput = await waitForCondition(
      () => {
        const input = document.querySelector(
          SELECTORS.LOGIN_PASSWORD
        ) as HTMLInputElement | null;

        return input && isVisible(input) ? input : null;
      },
      2000
    );

    if (!passwordInput) {
      return {
        success: false,
        error: 'Password field not found',
      };
    }

    passwordInput.focus();
    setInputValue(passwordInput, payload.password);

    // Verify credentials without logging their values.
    if (
      usernameInput.value !== payload.username ||
      passwordInput.value !== payload.password
    ) {
      return {
        success: false,
        error: 'Credential fields could not be populated correctly',
      };
    }

    console.log('[TBA-Login] Credentials populated successfully');

    // STEP 5: Detect CAPTCHA.
    // Check immediately first, then briefly wait for dynamically
    // rendered CAPTCHA elements.
    let captcha = findCaptcha();

    if (!captcha.detected) {
      await waitForCondition(
        () => {
          const result = findCaptcha();
          return result.detected ? result : null;
        },
        TIMEOUT.captcha
      );

      captcha = findCaptcha();
    }

    if (captcha.detected) {
      console.log('[TBA-Login] CAPTCHA detected');

      return {
        success: true,
        data: {
          captchaRequired: true,
          nlpText: captcha.nlpText,
        },
      };
    }

    // STEP 6: Find login modal.
    const loginContainer = findLoginContainer(usernameInput);

    if (!loginContainer) {
      return {
        success: false,
        error: 'Login form container not found',
      };
    }

    // STEP 7: Find Sign In button.
    const submitButton = findSubmitButton(loginContainer);

    if (!submitButton) {
      return {
        success: false,
        error: 'Sign In button not found in login modal',
      };
    }

    console.log('[TBA-Login] Submitting login');

    submitButton.click();

    // STEP 8: Wait for a meaningful response.
    const response = await waitForCondition(() => {
      const captchaResult = findCaptcha();
      const error = findLoginError();

      const formStillVisible = isVisible(usernameInput);

      if (captchaResult.detected) {
        return {
          captchaRequired: true,
          nlpText: captchaResult.nlpText,
          error: null,
        };
      }

      if (error) {
        return {
          captchaRequired: false,
          error,
        };
      }

      // The login modal disappearing is a possible success signal,
      // but is not definitive proof of authentication.
      if (!formStillVisible) {
        return {
          captchaRequired: false,
          error: null,
        };
      }

      return null;
    }, TIMEOUT.loginResponse);

    if (response?.captchaRequired) {
      console.log('[TBA-Login] CAPTCHA appeared after submission');

      return {
        success: true,
        data: {
          captchaRequired: true,
          nlpText: response.nlpText,
        },
      };
    }

    if (response?.error) {
      console.warn('[TBA-Login] Login error:', response.error);

      return {
        success: false,
        error: response.error,
      };
    }

    console.log(
      '[TBA-Login] Login submission completed; authentication should be verified separately'
    );

    return {
      success: true,
      data: {
        captchaRequired: false,
      },
    };

  } catch (error) {
    console.error('[TBA-Login] Automation failed:', error);

    return {
      success: false,
      error: `Login automation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
