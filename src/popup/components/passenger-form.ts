// Passenger Form component - add/edit/remove passengers with IRCTC validation

import type { Passenger, Gender, BerthPreference, IdType } from '../../shared/types';
import { validatePassenger } from '../../shared/validators';

let passengers: Passenger[] = [];

export function initPassengerForm(): void {
  renderPassengerList();
  document.getElementById('add-passenger-btn')?.addEventListener('click', addPassengerRow);
}

function renderPassengerList(): void {
  const container = document.getElementById('passenger-form-container')!;
  container.innerHTML = '';

  passengers.forEach((p, index) => {
    container.appendChild(createPassengerRow(p, index));
  });

  if (passengers.length === 0) {
    addPassengerRow();
  }
}

function createPassengerRow(passenger: Passenger | null, index: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'passenger-row';
  row.dataset.index = String(index);

  row.innerHTML = `
    <div class="passenger-header">
      <strong>Passenger ${index + 1}</strong>
      <button class="btn-remove" data-index="${index}">✕</button>
    </div>
    <div class="form-group">
      <input type="text" class="psgn-name" placeholder="Full Name (UPPERCASE)" maxlength="16"
        value="${passenger?.name ?? ''}" style="text-transform:uppercase">
    </div>
    <div class="form-row">
      <div class="form-group half">
        <input type="number" class="psgn-age" placeholder="Age" min="5" max="125"
          value="${passenger?.age ?? ''}">
      </div>
      <div class="form-group half">
        <select class="psgn-gender">
          <option value="M" ${passenger?.gender === 'M' ? 'selected' : ''}>Male</option>
          <option value="F" ${passenger?.gender === 'F' ? 'selected' : ''}>Female</option>
          <option value="T" ${passenger?.gender === 'T' ? 'selected' : ''}>Transgender</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group half">
        <select class="psgn-berth">
          <option value="NONE" ${passenger?.berthPreference === 'NONE' ? 'selected' : ''}>No Preference</option>
          <option value="LB" ${passenger?.berthPreference === 'LB' ? 'selected' : ''}>Lower</option>
          <option value="MB" ${passenger?.berthPreference === 'MB' ? 'selected' : ''}>Middle</option>
          <option value="UB" ${passenger?.berthPreference === 'UB' ? 'selected' : ''}>Upper</option>
          <option value="SL" ${passenger?.berthPreference === 'SL' ? 'selected' : ''}>Side Lower</option>
          <option value="SU" ${passenger?.berthPreference === 'SU' ? 'selected' : ''}>Side Upper</option>
        </select>
      </div>
      <div class="form-group half">
        <select class="psgn-id-type">
          <option value="AADHAAR" ${passenger?.idType === 'AADHAAR' ? 'selected' : ''}>Aadhaar</option>
          <option value="PAN" ${passenger?.idType === 'PAN' ? 'selected' : ''}>PAN</option>
          <option value="PASSPORT" ${passenger?.idType === 'PASSPORT' ? 'selected' : ''}>Passport</option>
          <option value="VOTER_ID" ${passenger?.idType === 'VOTER_ID' ? 'selected' : ''}>Voter ID</option>
          <option value="DRIVING_LICENSE" ${passenger?.idType === 'DRIVING_LICENSE' ? 'selected' : ''}>Driving License</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <input type="text" class="psgn-id-number" placeholder="ID Number"
        value="${passenger?.idNumber ?? ''}">
    </div>
    <p class="validation-error hidden" data-index="${index}"></p>
  `;

  row.querySelector('.btn-remove')?.addEventListener('click', () => removePassenger(index));
  return row;
}

function addPassengerRow(): void {
  if (passengers.length >= 4) {
    alert('Maximum 4 passengers allowed for Tatkal booking');
    return;
  }

  passengers.push({
    id: crypto.randomUUID(),
    name: '',
    age: 0,
    gender: 'M',
    berthPreference: 'NONE',
    idType: 'AADHAAR',
    idNumber: '',
    nationality: 'IN',
  });

  renderPassengerList();
}

function removePassenger(index: number): void {
  passengers.splice(index, 1);
  renderPassengerList();
}

export function getPassengers(): Passenger[] {
  const rows = document.querySelectorAll('.passenger-row');
  const result: Passenger[] = [];

  rows.forEach((row, index) => {
    const name = (row.querySelector('.psgn-name') as HTMLInputElement).value.trim().toUpperCase();
    const age = parseInt((row.querySelector('.psgn-age') as HTMLInputElement).value) || 0;
    const gender = (row.querySelector('.psgn-gender') as HTMLSelectElement).value as Gender;
    const berthPreference = (row.querySelector('.psgn-berth') as HTMLSelectElement).value as BerthPreference;
    const idType = (row.querySelector('.psgn-id-type') as HTMLSelectElement).value as IdType;
    const idNumber = (row.querySelector('.psgn-id-number') as HTMLInputElement).value.trim();

    result.push({
      id: passengers[index]?.id ?? crypto.randomUUID(),
      name,
      age,
      gender,
      berthPreference,
      idType,
      idNumber,
      nationality: 'IN',
    });
  });

  return result;
}

export function setPassengers(newPassengers: Passenger[]): void {
  passengers = [...newPassengers];
  renderPassengerList();
}

export function validateAllPassengers(): { valid: boolean; errors: string[] } {
  const currentPassengers = getPassengers();
  const errors: string[] = [];

  if (currentPassengers.length === 0) {
    errors.push('At least one passenger is required');
  }

  currentPassengers.forEach((p, i) => {
    const result = validatePassenger(p);
    if (!result.valid) {
      errors.push(`Passenger ${i + 1}: ${result.errors.join(', ')}`);
    }
  });

  return { valid: errors.length === 0, errors };
}
