// Notifications - Chrome notifications for booking results

export function showBookingSuccess(pnr: string, trainNumber: string): void {
  chrome.notifications.create('booking-success', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Tatkal Booking Confirmed! 🎉',
    message: `PNR: ${pnr}\nTrain: ${trainNumber}`,
    priority: 2,
    requireInteraction: true,
  });
}

export function showBookingFailed(reason: string): void {
  chrome.notifications.create('booking-failed', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Booking Failed ❌',
    message: reason,
    priority: 2,
    requireInteraction: true,
  });
}

export function showRetryNotification(attempt: number, maxAttempts: number): void {
  chrome.notifications.create('booking-retry', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Retrying Booking...',
    message: `Attempt ${attempt}/${maxAttempts}`,
    priority: 1,
  });
}

export function showTimingNotification(secondsUntil: number): void {
  chrome.notifications.create('booking-timing', {
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: 'Tatkal Window Opening Soon',
    message: `Booking will start in ${secondsUntil} seconds`,
    priority: 1,
  });
}
