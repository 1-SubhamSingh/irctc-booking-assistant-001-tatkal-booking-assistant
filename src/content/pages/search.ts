
import { SELECTORS } from '../../shared/constants';
import { waitForElement, setInputValue } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

interface SearchPayload {
  source: string;
  destination: string;
  date: string;
  classType: string;
  quota: string;
}

const TIMEOUT = {
  autocomplete: 2500,
  calendar: 3000,
  dropdown: 2500,
  calendarUpdate: 1500,
};

const CALENDAR_SELECTOR =
  '.p-datepicker:not(.p-datepicker-inline), .ui-datepicker, .p-datepicker-panel, .p-component.p-datepicker';

const DROPDOWN_ITEMS =
  'p-dropdownitem li, li.ui-dropdown-item, li.p-dropdown-item, li[role="option"]';

const CLASS_MAP: Record<string, string[]> = {
  '1A': ['First Class', '1A'],
  '2A': ['2 Tier', '2A', 'AC 2'],
  '3A': ['3 Tier', '3A', 'AC 3 Tier'],
  '3E': ['3 Economy', '3E'],
  'SL': ['Sleeper', 'SL'],
  '2S': ['Second Sitting', '2S'],
  'CC': ['Chair Car', 'CC'],
  'EC': ['Exec Chair', 'EC'],
  'TQ': ['TATKAL', 'Tatkal'],
  'PT': ['PREMIUM TATKAL', 'Premium'],
  'GN': ['GENERAL', 'General'],
  'LD': ['LADIES', 'Ladies'],
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isVisible(element: Element): boolean {
  const html = element as HTMLElement;

  return (
    html.isConnected &&
    html.getClientRects().length > 0 &&
    getComputedStyle(html).visibility !== 'hidden'
  );
}

/**
 * Wait for an actual DOM condition instead of sleeping.
 */
function waitForCondition<T>(
  condition: () => T | null | undefined | false,
  timeout = 3000,
  root: Node = document.body
): Promise<T | null> {
  const initial = condition();
  if (initial) return Promise.resolve(initial as T);

  return new Promise(resolve => {
    let timer: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver(() => {
      const result = condition();

      if (result) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(result as T);
      }
    });

    timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'aria-expanded',
        'disabled',
      ],
    });

    // Prevent missing a change between initial check and observer setup.
    const result = condition();

    if (result) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(result as T);
    }
  });
}

function parseDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
    [day, month, year] = dateStr.split(/[/-]/).map(Number);
  } else {
    throw new Error('Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY');
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    throw new Error('Invalid journey date');
  }

  return { year, month, day };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Select station from autocomplete.
 */
async function selectAutocompleteItem(
  station: string,
  input: HTMLInputElement
): Promise<boolean> {
  const item = await waitForCondition(() => {
    const items = document.querySelectorAll(
      SELECTORS.SEARCH_AUTOCOMPLETE_ITEM
    );

    return Array.from(items).find(item =>
      isVisible(item) &&
      normalize(item.textContent || '').includes(normalize(station))
    ) || null;
  }, TIMEOUT.autocomplete);

  if (item) {
    (item as HTMLElement).click();
    return true;
  }

  // Preserve original Enter fallback.
  input.focus();
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
    })
  );

  return false;
}

/**
 * Find the visible PrimeNG calendar panel.
 */
function findCalendarPanel(
  calendar: HTMLElement
): Element | null {
  const globalPanel = document.querySelector(CALENDAR_SELECTOR);

  if (globalPanel && isVisible(globalPanel)) {
    return globalPanel;
  }

  const localPanel = calendar.querySelector(
    '.p-datepicker, .ui-datepicker'
  );

  return localPanel && isVisible(localPanel)
    ? localPanel
    : null;
}

function isTargetMonth(
  calendar: Element,
  target: { year: number; month: number }
): boolean {
  const title = calendar.querySelector(
    '.ui-datepicker-title, .p-datepicker-title'
  );

  const text = title?.textContent?.trim() || '';

  return (
    text.includes(MONTH_NAMES[target.month - 1]) &&
    text.includes(String(target.year))
  );
}

/**
 * Navigate to target month.
 * Re-query title after every click because Angular may update it.
 */
async function navigateToMonth(
  calendar: Element,
  target: { year: number; month: number }
): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    if (isTargetMonth(calendar, target)) {
      return true;
    }

    const nextButton = calendar.querySelector(
      '.ui-datepicker-next, .p-datepicker-next, a[data-handler="next"]'
    ) as HTMLElement | null;

    if (!nextButton || !isVisible(nextButton)) {
      return false;
    }

    const previousTitle = calendar.querySelector(
      '.ui-datepicker-title, .p-datepicker-title'
    )?.textContent?.trim();

    nextButton.click();

    await waitForCondition(() => {
      const currentTitle = calendar.querySelector(
        '.ui-datepicker-title, .p-datepicker-title'
      )?.textContent?.trim();

      return currentTitle && currentTitle !== previousTitle
        ? currentTitle
        : null;
    }, 1200, calendar);
  }

  return isTargetMonth(calendar, target);
}

/**
 * Select exact day in the correct month.
 */
function selectCalendarDay(
  calendar: Element,
  day: number
): boolean {
  const cells = calendar.querySelectorAll('td');

  for (const td of cells) {
    if (
      td.classList.contains('p-datepicker-other-month') ||
      td.classList.contains('ui-datepicker-other-month') ||
      td.classList.contains('p-disabled') ||
      td.getAttribute('aria-disabled') === 'true'
    ) {
      continue;
    }

    const span = td.querySelector('span, a');

    if (
      span?.textContent?.trim() === String(day) &&
      !span.classList.contains('p-disabled')
    ) {
      (span as HTMLElement).click();
      return true;
    }
  }

  // Preserve direct TD fallback.
  for (const td of cells) {
    if (
      td.textContent?.trim() === String(day) &&
      !td.classList.contains('p-datepicker-other-month') &&
      !td.classList.contains('ui-datepicker-other-month') &&
      !td.classList.contains('p-disabled')
    ) {
      (td as HTMLElement).click();
      return true;
    }
  }

  return false;
}

/**
 * Set journey date.
 */
async function selectJourneyDate(
  dateStr: string
): Promise<boolean> {
  const target = parseDate(dateStr);

  const calendar = document.querySelector(
    'p-calendar'
  ) as HTMLElement | null;

  if (!calendar) {
    const dateInput = document.querySelector(
      SELECTORS.SEARCH_DATE
    ) as HTMLInputElement | null;

    if (!dateInput) return false;

    dateInput.click();

    const formatted =
      `${String(target.day).padStart(2, '0')}/` +
      `${String(target.month).padStart(2, '0')}/` +
      `${target.year}`;

    setInputValue(dateInput, formatted);

    return true;
  }

  const trigger = calendar.querySelector(
    'button, .p-datepicker-trigger, .ui-datepicker-trigger, .p-calendar-button'
  ) as HTMLElement | null;

  const input = calendar.querySelector(
    'input'
  ) as HTMLInputElement | null;

  (trigger || input || calendar).click();

  let panel = await waitForCondition(
    () => findCalendarPanel(calendar),
    TIMEOUT.calendar
  );

  // Preserve input-click fallback.
  if (!panel && input) {
    input.click();

    panel = await waitForCondition(
      () => findCalendarPanel(calendar),
      TIMEOUT.calendar
    );
  }

  if (!panel) return false;

  const monthSelected = await navigateToMonth(panel, target);

  if (!monthSelected) return false;

  const previousValue = input?.value;

  if (!selectCalendarDay(panel, target.day)) {
    return false;
  }

  // Allow Angular to commit the selected date.
  if (input) {
    await waitForCondition(
      () => input.value && input.value !== previousValue
        ? input.value
        : null,
      TIMEOUT.calendarUpdate
    );
  }

  return true;
}

/**
 * Select PrimeNG or native dropdown value.
 */
async function selectDropdown(
  dropdown: HTMLElement,
  value: string
): Promise<boolean> {
  if (dropdown.tagName === 'SELECT') {
    const select = dropdown as HTMLSelectElement;

    const option = Array.from(select.options).find(
      option =>
        normalize(option.value) === normalize(value) ||
        normalize(option.textContent || '') === normalize(value)
    );

    if (!option) return false;

    setInputValue(select, option.value);
    return true;
  }

  if (dropdown.tagName !== 'P-DROPDOWN') {
    return false;
  }

  const label = dropdown.querySelector(
    '.ui-dropdown-label, .p-dropdown-label'
  );

  if (label && normalize(label.textContent || '').includes(normalize(value))) {
    return true;
  }

  const trigger = dropdown.querySelector(
    '.ui-dropdown-trigger, .p-dropdown-trigger, .ui-dropdown, .p-dropdown'
  ) as HTMLElement | null;

  (trigger || dropdown).click();

  const items = await waitForCondition(() => {
    const options = document.querySelectorAll(DROPDOWN_ITEMS);

    return options.length > 0 &&
      Array.from(options).some(isVisible)
      ? options
      : null;
  }, TIMEOUT.dropdown);

  if (!items) return false;

  const searchTerms = CLASS_MAP[value] || [value];

  const visibleItems = Array.from(items).filter(isVisible);

  // Prefer exact matches before partial matches.
  const selected =
    visibleItems.find(item =>
      searchTerms.some(term =>
        normalize(item.textContent || '') === normalize(term)
      )
    ) ||
    visibleItems.find(item =>
      searchTerms.some(term =>
        normalize(item.textContent || '').includes(normalize(term))
      )
    );

  if (!selected) {
    (trigger || dropdown).click();
    return false;
  }

  (selected as HTMLElement).click();

  return true;
}

/**
 * Main search workflow.
 */
export async function handleSearch(
  payload: SearchPayload
): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Search] Starting search:', payload);

    const targetDate = parseDate(payload.date);

    // STEP 1: Source station.
    const sourceInput = await waitForElement(
      SELECTORS.SEARCH_SOURCE
    ) as HTMLInputElement;

    if (!sourceInput) {
      return {
        success: false,
        error: 'Source station input not found',
      };
    }

    setInputValue(sourceInput, payload.source);

    await selectAutocompleteItem(payload.source, sourceInput);

    // STEP 2: Destination station.
    const destInput = await waitForCondition(
      () => document.querySelector(
        SELECTORS.SEARCH_DESTINATION
      ) as HTMLInputElement | null,
      2000
    );

    if (!destInput) {
      return {
        success: false,
        error: 'Destination input not found',
      };
    }

    setInputValue(destInput, payload.destination);

    await selectAutocompleteItem(
      payload.destination,
      destInput
    );

    // STEP 3: Journey date.
    console.log('[TBA-Search] Selecting date:', targetDate);

    const dateSelected = await selectJourneyDate(payload.date);

    if (!dateSelected) {
      return {
        success: false,
        error: 'Could not select the requested journey date',
      };
    }

    // STEP 4: Travel class.
    const classDropdown = await waitForCondition(
      () => document.querySelector(
        SELECTORS.SEARCH_CLASS
      ) as HTMLElement | null,
      2000
    );

    if (!classDropdown) {
      return {
        success: false,
        error: 'Class dropdown not found',
      };
    }

    const classSelected = await selectDropdown(
      classDropdown,
      payload.classType
    );

    if (!classSelected) {
      return {
        success: false,
        error: `Could not select class: ${payload.classType}`,
      };
    }

    // STEP 5: Quota.
    const quotaDropdown = await waitForCondition(
      () => document.querySelector(
        SELECTORS.SEARCH_QUOTA
      ) as HTMLElement | null,
      2000
    );

    if (!quotaDropdown) {
      return {
        success: false,
        error: 'Quota dropdown not found',
      };
    }

    const quotaSelected = await selectDropdown(
      quotaDropdown,
      payload.quota
    );

    if (!quotaSelected) {
      return {
        success: false,
        error: `Could not select quota: ${payload.quota}`,
      };
    }

    // STEP 6: Submit.
    const submitButton = await waitForCondition(
      () => {
        const button = document.querySelector(
          SELECTORS.SEARCH_SUBMIT
        ) as HTMLButtonElement | null;

        if (button && isVisible(button) && !button.disabled) {
          return button;
        }

        // Preserve text-based fallback.
        const buttons = document.querySelectorAll('button');

        return Array.from(buttons).find(btn => {
          const text = normalize(btn.textContent || '');

          return (
            isVisible(btn) &&
            !btn.disabled &&
            (text.includes('SEARCH') || text.includes('FIND TRAIN'))
          );
        }) as HTMLButtonElement | undefined || null;
      },
      3000
    );

    if (!submitButton) {
      return {
        success: false,
        error: 'Search submit button not found',
      };
    }

    console.log('[TBA-Search] Submitting search');

    submitButton.click();

    return { success: true };

  } catch (error) {
    console.error('[TBA-Search] Automation failed:', error);

    return {
      success: false,
      error: `Search automation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
