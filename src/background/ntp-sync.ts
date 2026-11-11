// NTP time synchronization module
// Syncs with WorldTimeAPI to calculate clock offset for precise Tatkal triggering

import { NTP_URLS, TIMING } from '../shared/constants';
import { getStorage, setStorage } from '../shared/storage';

let ntpOffset = 0; // Milliseconds offset: server_time - local_time

export async function syncNtpTime(): Promise<number> {
  const offsets: number[] = [];

  for (let i = 0; i < TIMING.NTP_SYNC_SAMPLES; i++) {
    const offset = await fetchTimeOffset();
    if (offset !== null) {
      offsets.push(offset);
    }
    // Small delay between requests to avoid rate limiting
    if (i < TIMING.NTP_SYNC_SAMPLES - 1) {
      await delay(200);
    }
  }

  if (offsets.length === 0) {
    console.warn('[TBA-NTP] Failed to sync time, using previous offset');
    return ntpOffset;
  }

  // Sort and take median to reduce outlier impact
  offsets.sort((a, b) => a - b);
  const medianIndex = Math.floor(offsets.length / 2);
  ntpOffset = offsets[medianIndex];

  // Persist offset
  const settings = await getStorage('settings');
  if (settings) {
    await setStorage('settings', { ...settings, ntpOffset });
  }

  console.log(`[TBA-NTP] Synced. Offset: ${ntpOffset}ms (${offsets.length} samples)`);
  return ntpOffset;
}

async function fetchTimeOffset(): Promise<number | null> {
  for (const url of NTP_URLS) {
    try {
      const beforeFetch = performance.now();
      const response = await fetch(url);
      const afterFetch = performance.now();

      if (!response.ok) continue;

      const data = await response.json();
      const networkLatency = (afterFetch - beforeFetch) / 2;

      let serverTime: number;
      if (data.datetime) {
        // WorldTimeAPI format
        serverTime = new Date(data.datetime).getTime();
      } else if (data.dateTime) {
        // timeapi.io format
        serverTime = new Date(data.dateTime).getTime();
      } else {
        continue;
      }

      const localTime = Date.now();
      const offset = serverTime - localTime + networkLatency;

      return Math.round(offset);
    } catch {
      continue;
    }
  }
  return null;
}

export function getAccurateTime(): Date {
  return new Date(Date.now() + ntpOffset);
}

export function getOffset(): number {
  return ntpOffset;
}

export function setOffset(offset: number): void {
  ntpOffset = offset;
}

export function scheduleAtExactTime(targetHour: number, targetMinute: number, targetSecond: number, callback: () => void): void {
  const check = () => {
    const now = getAccurateTime();
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, targetSecond, 0);

    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      // Time has passed or is now
      callback();
      return;
    }

    if (diff > 60000) {
      // More than 1 minute away, use setTimeout with check
      setTimeout(check, diff - 60000);
    } else if (diff > 1000) {
      // Less than 1 minute, use tighter loop
      setTimeout(check, diff - 100);
    } else {
      // Less than 1 second, use requestAnimationFrame for precision
      const preciseWait = () => {
        const remaining = target.getTime() - getAccurateTime().getTime();
        if (remaining <= 0) {
          callback();
        } else {
          setTimeout(preciseWait, Math.min(remaining, 10));
        }
      };
      preciseWait();
    }
  };

  check();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
