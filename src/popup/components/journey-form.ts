// Journey Form component - source, destination, date, train, class, quota

import type { Journey, ClassType, QuotaType, TatkalType } from '../../shared/types';

let journeyData: Partial<Journey> = {};

export function initJourneyForm(): void {
  renderJourneyForm();
}

function renderJourneyForm(): void {
  const container = document.getElementById('journey-form-container')!;

  container.innerHTML = `
    <div class="form-group">
      <label>Source Station</label>
      <input type="text" id="journey-source" placeholder="Station code (e.g., NDLS)" maxlength="10">
    </div>
    <div class="form-group">
      <label>Destination Station</label>
      <input type="text" id="journey-destination" placeholder="Station code (e.g., PNBE)" maxlength="10">
    </div>
    <div class="form-group">
      <label>Journey Date</label>
      <input type="date" id="journey-date">
    </div>
    <div class="form-group">
      <label>Train Number</label>
      <input type="text" id="journey-train" placeholder="5-digit train number" maxlength="5" pattern="[0-9]{5}">
    </div>
    <div class="form-group">
      <label>Train Name (optional)</label>
      <input type="text" id="journey-train-name" placeholder="e.g., Rajdhani Express">
    </div>
    <div class="form-group">
      <label>Class</label>
      <select id="journey-class">
        <option value="2A">2A - AC 2 Tier</option>
        <option value="3A" selected>3A - AC 3 Tier</option>
        <option value="SL">SL - Sleeper</option>
        <option value="CC">CC - AC Chair Car</option>
        <option value="EC">EC - Exec Chair Car</option>
      </select>
    </div>
    <div class="form-group">
      <label>Quota</label>
      <select id="journey-quota">
        <option value="TQ" selected>Tatkal</option>
        <option value="PT">Premium Tatkal</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tatkal Type</label>
      <select id="journey-tatkal-type">
        <option value="AC" selected>AC (10:00 AM)</option>
        <option value="NON_AC">Non-AC (11:00 AM)</option>
      </select>
    </div>
  `;
}

export function getJourneyData(): Journey {
  const source = (document.getElementById('journey-source') as HTMLInputElement).value.trim().toUpperCase();
  const destination = (document.getElementById('journey-destination') as HTMLInputElement).value.trim().toUpperCase();
  const date = (document.getElementById('journey-date') as HTMLInputElement).value;
  const trainNumber = (document.getElementById('journey-train') as HTMLInputElement).value.trim();
  const trainName = (document.getElementById('journey-train-name') as HTMLInputElement).value.trim();
  const classType = (document.getElementById('journey-class') as HTMLSelectElement).value as ClassType;
  const quotaType = (document.getElementById('journey-quota') as HTMLSelectElement).value as QuotaType;
  const tatkalType = (document.getElementById('journey-tatkal-type') as HTMLSelectElement).value as TatkalType;

  return {
    id: crypto.randomUUID(),
    sourceStation: source,
    destinationStation: destination,
    journeyDate: date,
    trainNumber,
    trainName: trainName || undefined,
    classType,
    quotaType,
    tatkalType,
    createdAt: new Date().toISOString(),
  };
}

export function setJourneyData(journey: Journey): void {
  (document.getElementById('journey-source') as HTMLInputElement).value = journey.sourceStation;
  (document.getElementById('journey-destination') as HTMLInputElement).value = journey.destinationStation;
  (document.getElementById('journey-date') as HTMLInputElement).value = journey.journeyDate;
  (document.getElementById('journey-train') as HTMLInputElement).value = journey.trainNumber;
  (document.getElementById('journey-train-name') as HTMLInputElement).value = journey.trainName ?? '';
  (document.getElementById('journey-class') as HTMLSelectElement).value = journey.classType;
  (document.getElementById('journey-quota') as HTMLSelectElement).value = journey.quotaType;
  (document.getElementById('journey-tatkal-type') as HTMLSelectElement).value = journey.tatkalType;
}
