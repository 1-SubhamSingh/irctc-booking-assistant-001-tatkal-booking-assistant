// Passenger form page automator - fill all passenger details from template

import { SELECTORS } from '../../shared/constants';
import { waitForElement, setInputValue } from '../injector';
import type { Passenger, ExtensionResponse } from '../../shared/types';

interface PassengerPayload {
  passengers: Passenger[];
  mobile?: string;
  autoUpgrade?: boolean;
  travelInsurance?: boolean;
}

export async function handlePassengerForm(payload: PassengerPayload): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Passenger] Starting passenger form fill');

    // Wait for passenger form to load
    const passengerForm = await waitForElement(SELECTORS.PASSENGER_NAME, 20000);
    if (!passengerForm) {
      return { success: false, error: 'Passenger form not found' };
    }

    await delay(1000);

    // Fill each passenger
    for (let i = 0; i < payload.passengers.length; i++) {
      const passenger = payload.passengers[i];
      console.log('[TBA-Passenger] Filling passenger', i + 1, passenger.name);

      // Add passenger row if needed (first one already exists)
      if (i > 0) {
        const addBtn = document.querySelector(SELECTORS.ADD_PASSENGER_BTN) as HTMLButtonElement;
        if (addBtn) {
          addBtn.click();
          await delay(300);
        }
      }

      // Get all passenger name inputs and fill the i-th one
      const nameInputs = document.querySelectorAll(SELECTORS.PASSENGER_NAME) as NodeListOf<HTMLInputElement>;
      if (nameInputs[i]) {
        setInputValue(nameInputs[i], passenger.name);
        // Close name suggestion popup by pressing Enter.
        nameInputs[i].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await delay(150);
      }

      const ageInputs = document.querySelectorAll(SELECTORS.PASSENGER_AGE) as NodeListOf<HTMLInputElement>;
      if (ageInputs[i]) {
        setInputValue(ageInputs[i], String(passenger.age));
        await delay(150);
      }

      const rowRoot = findPassengerRowRoot(nameInputs[i]);

      const genderSelected = await selectGender(rowRoot, i, passenger.gender);
      if (!genderSelected) {
        console.warn('[TBA-Passenger] Gender dropdown not found/selected at index', i);
      }
      await delay(150);

      const berthMap: Record<string, string> = {
        LB: 'LB', MB: 'MB', UB: 'UB', SL: 'SL', SU: 'SU', NONE: 'NP',
      };
      await selectBerth(rowRoot, i, berthMap[passenger.berthPreference] ?? passenger.berthPreference);
      await delay(150);
    }

    // Mobile number
    const mobileInput = document.querySelector(SELECTORS.PASSENGER_MOBILE + ', input[formcontrolname="mobileNumber"], input[placeholder*="Mobile" i]') as HTMLInputElement;
    if (mobileInput) {
      const mobileValue = payload.mobile ?? '';
      if (mobileValue) {
        setInputValue(mobileInput, mobileValue);
      }
    }

    // Auto upgrade checkbox
    if (payload.autoUpgrade === false) {
      const autoUpgradeCheckbox = document.querySelector('input#autoUpgradation') as HTMLInputElement;
      if (autoUpgradeCheckbox?.checked) {
        autoUpgradeCheckbox.click();
      }
    }

    // Travel insurance - decline
    if (payload.travelInsurance === false) {
      const insuranceNo = document.querySelector('input[value="no"]#travelInsurance, input[value="0"], input[id*="insurance"]') as HTMLInputElement;
      if (insuranceNo) {
        insuranceNo.click();
      }
    }

    await delay(200);

    // Click continue/submit: never click Back/Modify.
    const candidateButtons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    let continueBtn: HTMLButtonElement | null = null;

    for (const btn of candidateButtons) {
      const text = (btn.textContent?.trim().toUpperCase() ?? '').replace(/\s+/g, ' ');
      const isNegative = text.includes('BACK') || text.includes('MODIFY') || text.includes('CANCEL') || text.includes('RESET');
      const isForward = text.includes('CONTINUE') || text.includes('REVIEW') || text.includes('PAY') || text.includes('PROCEED');
      const isVisible = btn.offsetParent !== null;
      const isEnabled = !btn.disabled;
      if (isVisible && isEnabled && isForward && !isNegative) {
        continueBtn = btn;
        break;
      }
    }

    if (!continueBtn) {
      // Fallback: use selector candidates but still filter out Back/Modify.
      const selectorCandidates = Array.from(document.querySelectorAll(SELECTORS.PASSENGER_SUBMIT)) as HTMLButtonElement[];
      continueBtn = selectorCandidates.find((btn) => {
        const text = (btn.textContent?.trim().toUpperCase() ?? '').replace(/\s+/g, ' ');
        return !text.includes('BACK') && !text.includes('MODIFY') && btn.offsetParent !== null && !btn.disabled;
      }) ?? null;
    }

    if (continueBtn) {
      console.log('[TBA-Passenger] Clicking continue/submit button:', continueBtn.textContent?.trim());
      continueBtn.click();
      return { success: true };
    }

    return { success: false, error: 'Continue button not found on passenger form' };
  } catch (e) {
    return { success: false, error: `Passenger form failed: ${(e as Error).message}` };
  }
}

function findPassengerRowRoot(nameInput: HTMLElement | undefined): Element {
  return nameInput?.closest('.passenger-row, .form-group, .col-xs-12, div[class*="passenger"], app-passenger') ?? document.body;
}

async function selectGender(rowRoot: Element, index: number, gender: string): Promise<boolean> {
  const genderMap: Record<string, string[]> = {
    M: ['MALE'],
    F: ['FEMALE'],
    T: ['TRANSGENDER'],
  };
  const aliases = genderMap[gender] ?? [gender];

  const nativeSelects = document.querySelectorAll('select[formcontrolname="passengerGender"]') as NodeListOf<HTMLSelectElement>;
  if (nativeSelects[index]) {
    setInputValue(nativeSelects[index], gender);
    return true;
  }

  const dropdown = getDropdownByIndex(rowRoot, SELECTORS.PASSENGER_GENDER, index, 0);
  return dropdown ? selectPrimeDropdown(dropdown, aliases) : false;
}

async function selectBerth(rowRoot: Element, index: number, berth: string): Promise<boolean> {
  const berthMap: Record<string, string[]> = {
    LB: ['LOWER', 'LB'],
    MB: ['MIDDLE', 'MB'],
    UB: ['UPPER', 'UB'],
    SL: ['SIDE LOWER', 'SL'],
    SU: ['SIDE UPPER', 'SU'],
    NP: ['NO PREFERENCE'],
    NONE: ['NO PREFERENCE'],
  };
  const aliases = berthMap[berth] ?? [berth];

  const nativeSelects = document.querySelectorAll('select[formcontrolname="passengerBerthChoice"]') as NodeListOf<HTMLSelectElement>;
  if (nativeSelects[index]) {
    setInputValue(nativeSelects[index], berth);
    return true;
  }

  const dropdown = getDropdownByIndex(rowRoot, SELECTORS.PASSENGER_BERTH, index, 2);
  return dropdown ? selectPrimeDropdown(dropdown, aliases) : false;
}

function getDropdownByIndex(rowRoot: Element, selector: string, index: number, rowFallbackOffset: number): HTMLElement | null {
  const rowDropdown = rowRoot.querySelector(selector) as HTMLElement | null;
  if (rowDropdown) return rowDropdown;

  const matchingDropdowns = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  if (matchingDropdowns[index]) return matchingDropdowns[index];

  const allDropdowns = Array.from(document.querySelectorAll('p-dropdown, .p-dropdown')) as HTMLElement[];
  return allDropdowns[(index * 3) + rowFallbackOffset] ?? null;
}

async function selectPrimeDropdown(dropdown: HTMLElement, aliases: string[]): Promise<boolean> {
  const trigger = dropdown.querySelector('.p-dropdown-trigger, .ui-dropdown-trigger, .p-dropdown, .ui-dropdown') as HTMLElement | null;
  (trigger ?? dropdown).click();
  await delay(300);

  const options = await waitForDropdownOptions();
  const normalizedAliases = aliases.map(normalizeText);

  for (const option of options) {
    const optionText = normalizeText(option.textContent ?? '');
    if (normalizedAliases.some((alias) => optionText === alias || optionText.includes(alias))) {
      console.log('[TBA-Passenger] Selecting dropdown option:', option.textContent?.trim());
      option.click();
      option.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }

  console.warn('[TBA-Passenger] No dropdown match for:', aliases.join('/'), 'options:', options.map((o) => o.textContent?.trim()).join(', '));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return false;
}

async function waitForDropdownOptions(): Promise<HTMLElement[]> {
  const selector = 'p-dropdownitem li, li.p-dropdown-item, li.ui-dropdown-item, li[role="option"], .p-dropdown-items li, .ui-dropdown-items li';

  for (let attempt = 0; attempt < 10; attempt++) {
    const options = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    const visibleOptions = options.filter((option) => option.offsetParent !== null);
    if (visibleOptions.length > 0) return visibleOptions;
    await delay(100);
  }

  return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}