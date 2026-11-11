// Page router - detects current IRCTC page and routes to appropriate automator

import { IRCTC_URLS, SELECTORS } from '../shared/constants';
import type { PageType } from '../shared/types';
import { handleLogin } from './pages/login';
import { handleSearch } from './pages/search';
import { handleTrainSelect } from './pages/train-select';
import { handlePassengerForm } from './pages/passenger';
import { handleReviewBooking } from './pages/review-booking';
import { handlePayment } from './pages/payment';
import type { ExtensionResponse } from '../shared/types';

export function detectCurrentPage(): PageType {
  const url = window.location.href;
  const path = window.location.pathname;

  if (path.includes('/nget/train-search') && document.querySelector(SELECTORS.LOGIN_USERNAME)) {
    return 'LOGIN';
  }
  if (path.includes('/nget/train-search') && !document.querySelector(SELECTORS.LOGIN_USERNAME)) {
    if (document.querySelector(SELECTORS.TRAIN_LIST_CONTAINER)) {
      return 'TRAIN_LIST';
    }
    return 'SEARCH';
  }
  if (path.includes('/nget/booking/train-list')) {
    return 'TRAIN_LIST';
  }
  if (path.includes('/nget/booking/psgninput')) {
    return 'PASSENGER_FORM';
  }
  if (path.includes('/nget/booking/reviewBooking')) {
    return 'REVIEW_BOOKING';
  }
  if (path.includes('/nget/booking/payment') || path.includes('/nget/payment/')) {
    return 'PAYMENT';
  }
  if (path.includes('/nget/booking/confirm')) {
    return 'CONFIRMATION';
  }
  if (document.querySelector(SELECTORS.ERROR_MESSAGE)) {
    return 'ERROR';
  }

  return 'UNKNOWN';
}

export async function routeAction(message: { action: string; payload?: any }): Promise<ExtensionResponse> {
  switch (message.action) {
    case 'LOGIN':
      return handleLogin(message.payload);
    case 'SEARCH':
      return handleSearch(message.payload);
    case 'SELECT_TRAIN':
      return handleTrainSelect(message.payload);
    case 'FILL_PASSENGERS':
      return handlePassengerForm(message.payload);
    case 'REVIEW_BOOKING':
      return handleReviewBooking();
    case 'PAY':
      return handlePayment();
    default:
      return { success: false, error: `Unknown action: ${message.action}` };
  }
}
