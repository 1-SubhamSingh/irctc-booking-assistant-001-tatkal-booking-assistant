// Train selection page automator - find the target train and click Book Now

import { SELECTORS } from '../../shared/constants';
import { waitForElement } from '../injector';
import type { ExtensionResponse } from '../../shared/types';

interface TrainSelectPayload {
  trainNumber: string;
  classType: string;
  quotaType?: string;
  journeyDate?: string;
}

export async function handleTrainSelect(payload: TrainSelectPayload): Promise<ExtensionResponse> {
  try {
    console.log('[TBA-Train] Looking for train:', payload.trainNumber, 'class:', payload.classType);

    // Wait for train list to load
    const trainList = await waitForElement(SELECTORS.TRAIN_LIST_CONTAINER);
    if (!trainList) {
      return { success: false, error: 'Train list did not load' };
    }

    await delay(1000); // Allow Angular rendering

    // Find the target train by number - search in the entire page
    const allTrainCards = document.querySelectorAll(SELECTORS.TRAIN_ITEM + ', .train-card, app-train-avl-enq');
    console.log('[TBA-Train] Found', allTrainCards.length, 'train cards');

    let targetRow: Element | null = null;

    for (const row of allTrainCards) {
      const text = row.textContent || '';
      if (text.includes(payload.trainNumber) || text.includes(`(${payload.trainNumber})`)) {
        targetRow = row;
        console.log('[TBA-Train] Found target train card');
        break;
      }
    }

    // Fallback: search by strong/heading elements
    if (!targetRow) {
      const headings = document.querySelectorAll('strong, .train-heading, .trainName');
      for (const heading of headings) {
        if (heading.textContent?.includes(payload.trainNumber)) {
          // Go up to the train card container
          targetRow = heading.closest('.form-group, .train-card, app-train-avl-enq, .col-xs-12') || heading.parentElement?.parentElement || null;
          console.log('[TBA-Train] Found train via heading');
          break;
        }
      }
    }

    if (!targetRow) {
      console.error('[TBA-Train] Train not found. Page text sample:', document.body.textContent?.substring(0, 500));
      return { success: false, error: `Train ${payload.trainNumber} not found in results` };
    }

    // Step 1: Click the class box (e.g., "AC 3 Tier (3A)")
    // On IRCTC, each class is shown as a clickable box/td with text like "AC 3 Tier (3A)\nRefresh"
    const classCode = payload.classType; // e.g., "3A"
    const allClassBoxes = targetRow.querySelectorAll(
      'td.pre-avl, .pre-avl, td[class*="avl"], .classTd, table.train-avl td, .seat-class-box, div[class*="class"]'
    );
    console.log('[TBA-Train] Class boxes found:', allClassBoxes.length);

    let classClicked = false;
    for (const box of allClassBoxes) {
      const boxText = box.textContent?.trim() || '';
      // Match by class code in parentheses, e.g., "(3A)" or just "3A"
      if (boxText.includes(`(${classCode})`) || boxText === classCode) {
        console.log('[TBA-Train] Clicking class box:', boxText.substring(0, 30));
        (box as HTMLElement).click();
        classClicked = true;
        break;
      }
    }

    // Broader fallback: search any clickable element with class code text
    if (!classClicked) {
      const allElements = targetRow.querySelectorAll('td, div, span, a');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text.includes(`(${classCode})`) && !text.includes('Refresh C') && el.children.length < 5) {
          console.log('[TBA-Train] Clicking class element (fallback):', text.substring(0, 40));
          (el as HTMLElement).click();
          classClicked = true;
          break;
        }
      }
    }

    if (!classClicked) {
      console.warn('[TBA-Train] Could not find class box for', classCode);
      // Log all available class boxes for debugging
      allClassBoxes.forEach((box, i) => {
        console.log(`[TBA-Train] Box[${i}]:`, box.textContent?.trim().substring(0, 30));
      });
    }

    // Wait for availability to load after clicking class
    await delay(2500);

    // Step 2: Click the availability date cell
    // Structure: <td class="link"><div class="pre-avl">date</div><div class="WL">WL37</div></td>
    // Need to click on div.pre-avl or its parent td.link
    console.log('[TBA-Train] Looking for div.pre-avl availability cells...');

    let dateClicked = false;
    const targetDay = payload.journeyDate ? new Date(payload.journeyDate).getDate() : null;
    console.log('[TBA-Train] Target day:', targetDay);

    // Find all div.pre-avl elements - these are the clickable availability date cells
    const preAvlCells = document.querySelectorAll('div.pre-avl, td.link div.pre-avl');
    console.log('[TBA-Train] div.pre-avl cells found:', preAvlCells.length);

    for (const cell of preAvlCells) {
      const parentTd = cell.closest('td');
      const fullText = parentTd?.textContent?.trim() || cell.textContent?.trim() || '';
      console.log('[TBA-Train] Availability cell text:', fullText.replace(/\n/g, ' ').substring(0, 40));

      // Check if this cell matches our target date
      if (targetDay && fullText.includes(String(targetDay))) {
        console.log('[TBA-Train] Clicking matching date cell:', fullText.replace(/\n/g, ' ').substring(0, 30));
        (cell as HTMLElement).click();
        dateClicked = true;
        break;
      }
    }

    // Fallback: click the first div.pre-avl that doesn't have "NOT AVAILABLE"
    if (!dateClicked && preAvlCells.length > 0) {
      for (const cell of preAvlCells) {
        const parentTd = cell.closest('td');
        const fullText = parentTd?.textContent?.trim() || '';
        if (!fullText.includes('NOT AVAILABLE')) {
          console.log('[TBA-Train] Clicking first available cell:', fullText.replace(/\n/g, ' ').substring(0, 30));
          (cell as HTMLElement).click();
          dateClicked = true;
          break;
        }
      }
    }

    if (!dateClicked) {
      console.warn('[TBA-Train] Could not find any div.pre-avl cell to click');
    }

    await delay(1500);

    // Step 3: Click "Book Now" button
    // Look for Book Now within the train card first
    let bookBtn: HTMLButtonElement | null = targetRow.querySelector('button.btnDefault, button.book-btn, button[class*="book"]') as HTMLButtonElement | null;
    
    if (!bookBtn) {
      // Search more broadly - Book Now might appear below the class
      bookBtn = targetRow.querySelector('button') as HTMLButtonElement;
      if (bookBtn && !bookBtn.textContent?.toUpperCase().includes('BOOK')) {
        bookBtn = null;
      }
    }

    if (!bookBtn) {
      // Try finding "Book Now" button anywhere visible on page
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        const text = btn.textContent?.trim().toUpperCase() || '';
        if (text.includes('BOOK NOW') || text === 'BOOK NOW') {
          bookBtn = btn as HTMLButtonElement;
          break;
        }
      }
    }

    if (bookBtn) {
      console.log('[TBA-Train] Clicking Book Now:', bookBtn.textContent?.trim());
      bookBtn.click();
      return { success: true };
    }

    // If no Book Now button yet, wait for it (might appear after class selection)
    await delay(2000);
    const retryBtn = document.querySelector('button.btnDefault.train_Search, button.book-btn') as HTMLButtonElement;
    if (retryBtn) {
      console.log('[TBA-Train] Clicking Book Now (retry):', retryBtn.textContent?.trim());
      retryBtn.click();
      return { success: true };
    }

    return { success: false, error: 'Book Now button not found after class selection' };
  } catch (e) {
    return { success: false, error: `Train selection failed: ${(e as Error).message}` };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}