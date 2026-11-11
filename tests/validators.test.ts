import { describe, it, expect } from 'vitest';
import { validatePassenger, validateJourney, validateBookingTemplate } from '../src/shared/validators';
import type { Passenger, Journey } from '../src/shared/types';

describe('Validators', () => {
  it('validates a correct passenger', () => {
    const passenger: Passenger = {
      id: '1',
      name: 'RAHUL SHARMA',
      age: 28,
      gender: 'M',
      berthPreference: 'LB',
      foodPreference: 'V',
      seniorCitizen: false,
      nationality: 'IN',
      idType: 'AADHAAR',
      idNumber: '123456789012',
    };
    const result = validatePassenger(passenger);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags lowercase letters in passenger name', () => {
    const passenger: Passenger = {
      id: '1',
      name: 'Rahul Sharma',
      age: 28,
      gender: 'M',
      berthPreference: 'LB',
      foodPreference: 'V',
      seniorCitizen: false,
      nationality: 'IN',
      idType: 'AADHAAR',
    };
    const result = validatePassenger(passenger);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name must contain only uppercase letters and spaces');
  });

  it('validates journey details', () => {
    const journey: Journey = {
      sourceStation: 'NDLS',
      destinationStation: 'PNBE',
      journeyDate: '2026-12-01',
      trainNumber: '12394',
      classType: '3A',
      quotaType: 'TQ',
      tatkalType: 'AC',
    };
    const result = validateJourney(journey);
    expect(result.valid).toBe(true);
  });

  it('flags max passengers exceeding 4 for Tatkal', () => {
    const journey: Journey = {
      sourceStation: 'NDLS',
      destinationStation: 'PNBE',
      journeyDate: '2026-12-01',
      trainNumber: '12394',
      classType: '3A',
      quotaType: 'TQ',
      tatkalType: 'AC',
    };
    const passengers: Passenger[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      name: 'TEST PASSENGER',
      age: 30,
      gender: 'M',
      berthPreference: 'LB',
      foodPreference: 'V',
      seniorCitizen: false,
      nationality: 'IN',
      idType: 'AADHAAR',
    }));

    const result = validateBookingTemplate(journey, passengers);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Maximum 4 passengers'))).toBe(true);
  });
});

