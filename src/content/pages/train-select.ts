
import { SELECTORS } from '../../shared/constants';
import { waitForElement } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

interface TrainSelectPayload {
  trainNumber: string;
  classType: string;
  quotaType?: string;
  journeyDate?: string;
}

const TIMEOUTS = {
  trainList: 10000,
  availability: 6000,
  bookButton: 5000,
};

const CLASS_SELECTORS = [
  'td.pre-avl',
  '.pre-avl',
  'td[class*="avl"]',
  '.classTd',
  'table.train-avl td',
  '.seat-class-box',
].join(', ');

const DATE_CELL_SELECTOR = 'div.pre-avl, td.link div.pre-avl';

const BOOK_BUTTON_SELECTOR = [
  'button.btnDefault',
  'button.book-btn',
  'button[class*="book"]',
].join(', ');

/**
 * Wait until a DOM condition becomes true.
 * Uses MutationObserver rather than repeated fixed delays.
 */
function waitForCondition<T>(
  condition: () => T | null | undefined | false,
  timeout = 5000,
  root: Node = document.body
): Promise<T | null> {
  const initial = condition();
  if (initial) return Promise.resolve(initial);

  return new Promise((resolve) => {
    let observer: MutationObserver;

    const finish = (result: T | null) => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(result);
    };

    observer = new MutationObserver(() => {
      const result = condition();
      if (result) finish(result);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    const timer = setTimeout(() => finish(null), timeout);

    // Handle a DOM change between the initial check and observer setup.
    const result = condition();
    if (result) finish(result);
  });
}

function isVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;

  return (
    htmlElement.isConnected &&
    htmlElement.getClientRects().length > 0 &&
    getComputedStyle(htmlElement).visibility !== 'hidden'
  );
}

function clickElement(element: Element): void {
  (element as HTMLElement).click();
}

/**
 * Match train number as a complete numeric token.
 * Avoids matching 12345 when the requested number is 1234.
 */
function matchesTrainNumber(text: string, trainNumber: string): boolean {
  const escaped = trainNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\D)${escaped}(\\D|$)`).test(text);
}

/**
 * Parse YYYY-MM-DD without timezone-related date shifts.
 */
function parseJourneyDate(date?: string) {
  if (!date) return null;

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  return {
    day: Number(match[3]),
    month: Number(match[2]),
  };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4,
  may: 5, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Match a displayed availability date.
 */
function matchesJourneyDate(
  text: string,
  target: { day: number; month: number }
): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();

  const dayRegex = new RegExp(
    `(^|\\D)${target.day}(\\D|$)`
  );

  if (!dayRegex.test(normalized)) return false;

  const monthMatch = normalized.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i
  );

  // If the page displays a month, verify it too.
  if (monthMatch) {
    return MONTHS[monthMatch[1].slice(0, 3).toLowerCase()] === target.month;
  }

  // Some layouts display only the day number.
  return true;
}

function findTrainCard(trainNumber: string): Element | null {
  const cards = document.querySelectorAll(
    `${SELECTORS.TRAIN_ITEM}, .train-card, app-train-avl-enq`
  );

  for (const card of cards) {
    if (
      isVisible(card) &&
      matchesTrainNumber(card.textContent || '', trainNumber)
    ) {
      return card;
    }
  }

  // Heading fallback.
  const headings = document.querySelectorAll(
    'strong, .train-heading, .trainName'
  );

  for (const heading of headings) {
    if (!matchesTrainNumber(heading.textContent || '', trainNumber)) {
      continue;
    }

    const card = heading.closest(
      '.form-group, .train-card, app-train-avl-enq, .col-xs-12'
    );

    if (
      card &&
      isVisible(card) &&
      matchesTrainNumber(card.textContent || '', trainNumber)
    ) {
      return card;
    }
  }

  return null;
}

function findClassBox(
  trainRow: Element,
  classCode: string
): Element | null {
  const escaped = classCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const classRegex = new RegExp(`\\(${escaped}\\)`, 'i');

  const boxes = trainRow.querySelectorAll(CLASS_SELECTORS);

  for (const box of boxes) {
    const text = box.textContent?.trim() || '';

    if (
      isVisible(box) &&
      (text === classCode || classRegex.test(text))
    ) {
      return box;
    }
  }

  // Fallback: inspect smaller elements only.
  const elements = trainRow.querySelectorAll('td, div, span, a');

  for (const element of elements) {
    const text = element.textContent?.trim() || '';

    if (
      isVisible(element) &&
      element.children.length < 5 &&
      classRegex.test(text)
    ) {
      return element;
    }
  }

  return null;
}

function findAvailabilityCell(
  trainRow: Element,
  journeyDate?: string
): Element | null {
  const targetDate = parseJourneyDate(journeyDate);

  const cells = trainRow.querySelectorAll(DATE_CELL_SELECTOR);

  for (const cell of cells) {
    if (!isVisible(cell)) continue;

    const parentTd = cell.closest('td');
    const text = parentTd?.textContent || cell.textContent || '';

    if (text.toUpperCase().includes('NOT AVAILABLE')) {
      continue;
    }

    if (targetDate) {
      if (matchesJourneyDate(text, targetDate)) {
        return cell;
      }
    } else {
      return cell;
    }
  }

  return null;
}

function findBookButton(trainRow: Element): HTMLButtonElement | null {
  const buttons = trainRow.querySelectorAll<HTMLButtonElement>(
    `${BOOK_BUTTON_SELECTOR}, button`
  );

  for (const button of buttons) {
    const text = button.textContent?.trim().toUpperCase() || '';

    if (
      isVisible(button) &&
      !button.disabled &&
      text.includes('BOOK NOW')
    ) {
      return button;
    }
  }

  return null;
}

export async function handleTrainSelect(
  payload: TrainSelectPayload
): Promise<ExtensionResponse> {
  try {
    console.log(
      '[TBA-Train] Selecting train:',
      payload.trainNumber,
      'Class:',
      payload.classType,
      'Date:',
      payload.journeyDate
    );

    // Validate input.
    if (!/^\d+$/.test(payload.trainNumber)) {
      return { success: false, error: 'Invalid train number' };
    }

    if (!payload.classType?.trim()) {
      return { success: false, error: 'Class type is required' };
    }

    if (
      payload.journeyDate &&
      !parseJourneyDate(payload.journeyDate)
    ) {
      return { success: false, error: 'Invalid journey date format. Expected YYYY-MM-DD' };
    }

    // STEP 1: Wait for train list.
    const trainList = await waitForElement(
      SELECTORS.TRAIN_LIST_CONTAINER
    );

    if (!trainList) {
      return { success: false, error: 'Train list did not load' };
    }

    // STEP 2: Find exact train.
    const targetRow = await waitForCondition(
      () => findTrainCard(payload.trainNumber),
      TIMEOUTS.trainList
    );

    if (!targetRow) {
      return {
        success: false,
        error: `Train ${payload.trainNumber} not found in results`,
      };
    }

    console.log('[TBA-Train] Target train found');

    // STEP 3: Select class.
    const classBox = findClassBox(targetRow, payload.classType);

    if (!classBox) {
      return {
        success: false,
        error: `Class ${payload.classType} not found for train ${payload.trainNumber}`,
      };
    }

    console.log('[TBA-Train] Selecting class:', payload.classType);

    clickElement(classBox);

    // STEP 4: Wait for availability.
    const availabilityCell = await waitForCondition(
      () => findAvailabilityCell(targetRow, payload.journeyDate),
      TIMEOUTS.availability,
      targetRow
    );

    if (!availabilityCell) {
      return {
        success: false,
        error: payload.journeyDate
          ? `Availability not found for ${payload.journeyDate}`
          : 'No available journey dates found',
      };
    }

    console.log('[TBA-Train] Selecting journey date');

    clickElement(availabilityCell);

    // STEP 5: Wait for Book Now.
    const bookButton = await waitForCondition(
      () => findBookButton(targetRow),
      TIMEOUTS.bookButton,
      targetRow
    );

    if (!bookButton) {
      return {
        success: false,
        error: 'Book Now button not found after selection',
      };
    }

    console.log('[TBA-Train] Clicking Book Now');

    clickElement(bookButton);

    return { success: true };

  } catch (error) {
    console.error('[TBA-Train] Selection failed:', error);

    return {
      success: false,
      error: `Train selection failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
