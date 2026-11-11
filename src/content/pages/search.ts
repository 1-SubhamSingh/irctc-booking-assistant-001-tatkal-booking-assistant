// Train search page automator - fill source, destination, date, class, quota, submit

import { SELECTORS, TIMING } from '../../shared/constants';
import { waitForElement, setInputValue } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

interface SearchPayload {
  source: string;
  destination: string;
  date: string;
  classType: string;
  quota: string;
}

export async function handleSearch(payload: SearchPayload): Promise<ExtensionResponse> {
  try {
    // Wait for search form
    const sourceInput = await waitForElement(SELECTORS.SEARCH_SOURCE) as HTMLInputElement;
    if (!sourceInput) {
      return { success: false, error: 'Source station input not found' };
    }

    // Fill source station
    setInputValue(sourceInput, payload.source);
    await delay(300);
    // Select from autocomplete
    await selectAutocompleteItem(payload.source);
    await delay(300);

    // Fill destination station
    const destInput = document.querySelector(SELECTORS.SEARCH_DESTINATION) as HTMLInputElement;
    if (!destInput) {
      return { success: false, error: 'Destination input not found' };
    }
    setInputValue(destInput, payload.destination);
    await delay(300);
    await selectAutocompleteItem(payload.destination);
    await delay(300);

    // Set date - IRCTC uses PrimeNG p-calendar (readonly input, need to click icon/input to open)
    console.log('[TBA-Search] Setting date:', payload.date);
    const targetDate = parseDate(payload.date);
    console.log('[TBA-Search] Target date: day=', targetDate.day, 'month=', targetDate.month, 'year=', targetDate.year);

    // Find p-calendar component
    const pCalendar = document.querySelector('p-calendar') as HTMLElement;
    console.log('[TBA-Search] p-calendar found:', !!pCalendar);

    if (pCalendar) {
      // Click the calendar icon/button to open (PrimeNG has a trigger button)
      const calendarTrigger = pCalendar.querySelector(
        'button, .p-datepicker-trigger, .ui-datepicker-trigger, span.p-button-icon, .p-calendar-button'
      ) as HTMLElement;
      const calendarInput = pCalendar.querySelector('input') as HTMLInputElement;
      
      // Try clicking the trigger button first, then the input
      const clickEl = calendarTrigger || calendarInput || pCalendar;
      console.log('[TBA-Search] Clicking calendar trigger:', clickEl.tagName, clickEl.className?.substring(0, 30));
      clickEl.click();
      await delay(800);

      // Calendar panel appears in the DOM (might be appended to body)
      let calendarPanel = document.querySelector(
        '.p-datepicker:not(.p-datepicker-inline), .ui-datepicker, ' +
        '.p-datepicker-panel, .p-component.p-datepicker'
      );
      // Also check inside the p-calendar itself
      if (!calendarPanel) {
        calendarPanel = pCalendar.querySelector('.p-datepicker, .ui-datepicker');
      }
      // Broadest search
      if (!calendarPanel) {
        calendarPanel = document.querySelector('[class*="datepicker"]:not(input):not(p-calendar)');
      }

      console.log('[TBA-Search] Calendar panel found:', !!calendarPanel, calendarPanel?.className?.substring(0, 40));

      if (calendarPanel) {
        // Navigate to correct month if needed
        await navigateToMonth(calendarPanel, targetDate);
        await delay(300);

        // Click the correct day number
        // PrimeNG calendar days are: <td><span class="p-ripple">28</span></td>
        const allCells = calendarPanel.querySelectorAll('td');
        let dayClicked = false;
        for (const td of allCells) {
          // Skip header row, other month, disabled
          if (td.classList.contains('p-datepicker-other-month') || 
              td.classList.contains('ui-datepicker-other-month')) continue;
          const span = td.querySelector('span, a');
          if (span && span.textContent?.trim() === String(targetDate.day)) {
            if (!td.classList.contains('p-disabled') && !span.classList.contains('p-disabled')) {
              console.log('[TBA-Search] Clicking day:', targetDate.day);
              (span as HTMLElement).click();
              dayClicked = true;
              break;
            }
          }
        }

        if (!dayClicked) {
          // Try clicking td directly
          for (const td of allCells) {
            if (td.textContent?.trim() === String(targetDate.day) && 
                !td.classList.contains('p-datepicker-other-month')) {
              console.log('[TBA-Search] Clicking day td directly:', targetDate.day);
              td.click();
              dayClicked = true;
              break;
            }
          }
        }

        if (!dayClicked) {
          console.warn('[TBA-Search] Could not click day', targetDate.day);
          console.log('[TBA-Search] Calendar HTML sample:', calendarPanel.innerHTML.substring(0, 300));
        }
      } else {
        console.warn('[TBA-Search] Calendar panel did not appear! Trying input click...');
        // Last resort: click the input itself
        if (calendarInput) {
          calendarInput.click();
          await delay(800);
          // Check again
          const retryPanel = document.querySelector('.p-datepicker, .ui-datepicker, [class*="datepicker"]:not(input)');
          console.log('[TBA-Search] Retry calendar panel:', !!retryPanel);
          if (retryPanel) {
            const allCells = retryPanel.querySelectorAll('td span, td a');
            for (const cell of allCells) {
              if (cell.textContent?.trim() === String(targetDate.day)) {
                (cell as HTMLElement).click();
                console.log('[TBA-Search] Clicked day on retry:', targetDate.day);
                break;
              }
            }
          }
        }
      }
    } else {
      // No p-calendar found, try input directly
      const dateInput = document.querySelector(SELECTORS.SEARCH_DATE) as HTMLInputElement;
      if (dateInput) {
        console.log('[TBA-Search] No p-calendar, using input directly');
        dateInput.click();
        await delay(500);
        const formatted = `${String(targetDate.day).padStart(2, '0')}/${String(targetDate.month).padStart(2, '0')}/${targetDate.year}`;
        setInputValue(dateInput, formatted);
      }
    }
    await delay(500);

    // Set class (dropdown)
    const classDropdown = document.querySelector(SELECTORS.SEARCH_CLASS);
    if (classDropdown) {
      console.log('[TBA-Search] Setting class:', payload.classType, 'dropdown tag:', classDropdown.tagName);
      await selectDropdown(classDropdown as HTMLElement, payload.classType);
      await delay(500);
    } else {
      console.warn('[TBA-Search] Class dropdown not found! Trying broader search...');
      // Try finding any p-dropdown on the page
      const allDropdowns = document.querySelectorAll('p-dropdown');
      console.log('[TBA-Search] Found', allDropdowns.length, 'p-dropdown elements');
      for (const dd of allDropdowns) {
        const label = dd.querySelector('.ui-dropdown-label, .p-dropdown-label');
        if (label?.textContent?.includes('Class') || label?.textContent?.includes('All')) {
          console.log('[TBA-Search] Found class dropdown by label:', label.textContent);
          await selectDropdown(dd as HTMLElement, payload.classType);
          await delay(500);
          break;
        }
      }
    }

    // Set quota
    const quotaDropdown = document.querySelector(SELECTORS.SEARCH_QUOTA);
    if (quotaDropdown) {
      console.log('[TBA-Search] Setting quota:', payload.quota);
      await selectDropdown(quotaDropdown as HTMLElement, payload.quota);
      await delay(500);
    } else {
      console.warn('[TBA-Search] Quota dropdown not found!');
    }

    await delay(200);

    // Submit search
    const submitBtn = document.querySelector(SELECTORS.SEARCH_SUBMIT) as HTMLButtonElement;
    if (!submitBtn) {
      // Fallback: find by text
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        const text = btn.textContent?.trim().toUpperCase() || '';
        if (text.includes('SEARCH') || text.includes('FIND TRAIN')) {
          console.log('[TBA-Search] Found submit by text:', btn.textContent?.trim());
          (btn as HTMLButtonElement).click();
          return { success: true };
        }
      }
      return { success: false, error: 'Search submit button not found' };
    }
    console.log('[TBA-Search] Clicking submit:', submitBtn.textContent?.trim());
    submitBtn.click();

    return { success: true };
  } catch (e) {
    return { success: false, error: `Search automation failed: ${(e as Error).message}` };
  }
}

async function selectAutocompleteItem(stationCode: string): Promise<void> {
  await delay(500); // Wait for autocomplete dropdown
  const items = document.querySelectorAll(SELECTORS.SEARCH_AUTOCOMPLETE_ITEM);
  for (const item of items) {
    if (item.textContent?.includes(stationCode)) {
      (item as HTMLElement).click();
      return;
    }
  }
  // If no autocomplete found, press Enter
  const activeInput = document.activeElement as HTMLInputElement;
  if (activeInput) {
    activeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }
}

async function selectDropdown(dropdown: HTMLElement, value: string): Promise<void> {
  console.log('[TBA-Search] selectDropdown:', dropdown.tagName, 'value:', value);

  // Handle PrimeNG dropdown (p-dropdown) or native select
  if (dropdown.tagName === 'P-DROPDOWN') {
    // Click the dropdown to open it
    const trigger = dropdown.querySelector('.ui-dropdown-trigger, .p-dropdown-trigger, .ui-dropdown, .p-dropdown') as HTMLElement || dropdown;
    trigger.click();
    await delay(500);

    // Find dropdown panel items - PrimeNG creates them in a panel
    const items = document.querySelectorAll('p-dropdownitem li, li.ui-dropdown-item, li.p-dropdown-item, li[role="option"]');
    console.log('[TBA-Search] Dropdown items found:', items.length);

    // Class mapping for IRCTC: value code → display text contains
    const classMap: Record<string, string[]> = {
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

    const searchTerms = classMap[value] || [value];

    for (const item of items) {
      const text = item.textContent?.trim() || '';
      const matched = searchTerms.some(term => text.toUpperCase().includes(term.toUpperCase()));
      if (matched || text.includes(value)) {
        console.log('[TBA-Search] Selecting dropdown item:', text);
        (item as HTMLElement).click();
        return;
      }
    }
    console.warn('[TBA-Search] No match found for value:', value, '— items:', Array.from(items).map(i => i.textContent?.trim()).join(', '));

    // Close dropdown if nothing matched
    trigger.click();
  } else if (dropdown.tagName === 'SELECT') {
    setInputValue(dropdown as HTMLSelectElement, value);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  // Handle formats: "2026-05-28" or "28/05/2026" or "28-05-2026"
  let year: number, month: number, day: number;
  if (dateStr.includes('-') && dateStr.indexOf('-') === 4) {
    // ISO format: 2026-05-28
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (dateStr.includes('/')) {
    // DD/MM/YYYY
    [day, month, year] = dateStr.split('/').map(Number);
  } else if (dateStr.includes('-')) {
    // DD-MM-YYYY
    [day, month, year] = dateStr.split('-').map(Number);
  } else {
    // Fallback: try ISO
    const d = new Date(dateStr);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  return { year, month, day };
}

async function navigateToMonth(calendar: Element, target: { year: number; month: number; day: number }): Promise<void> {
  // Check current displayed month/year
  const titleEl = calendar.querySelector('.ui-datepicker-title, .p-datepicker-title');
  if (!titleEl) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Try navigating forward up to 12 months
  for (let i = 0; i < 12; i++) {
    const titleText = titleEl.textContent?.trim() || '';
    const targetMonthName = monthNames[target.month - 1];
    if (titleText.includes(targetMonthName) && titleText.includes(String(target.year))) {
      return; // Already on correct month
    }
    // Click next month button
    const nextBtn = calendar.querySelector('.ui-datepicker-next, .p-datepicker-next, a[data-handler="next"]') as HTMLElement;
    if (nextBtn) {
      nextBtn.click();
      await delay(200);
    } else {
      break;
    }
  }
}
