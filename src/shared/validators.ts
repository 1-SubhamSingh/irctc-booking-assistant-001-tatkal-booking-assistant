// Passenger and journey validation against IRCTC rules

import type { Passenger, Journey } from './types';
import { IRCTC_VALIDATION } from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassenger(passenger: Passenger): ValidationResult {
  const errors: string[] = [];

  // Name validation
  if (!passenger.name || passenger.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (passenger.name.length > IRCTC_VALIDATION.MAX_NAME_LENGTH) {
    errors.push(`Name must be ${IRCTC_VALIDATION.MAX_NAME_LENGTH} characters or less`);
  } else if (!/^[A-Z\s]+$/.test(passenger.name)) {
    errors.push('Name must contain only uppercase letters and spaces');
  }

  // Age validation
  if (!passenger.age || passenger.age < IRCTC_VALIDATION.MIN_PASSENGER_AGE) {
    errors.push(`Age must be at least ${IRCTC_VALIDATION.MIN_PASSENGER_AGE}`);
  } else if (passenger.age > IRCTC_VALIDATION.MAX_PASSENGER_AGE) {
    errors.push(`Age must be ${IRCTC_VALIDATION.MAX_PASSENGER_AGE} or less`);
  }

  // ID number validation based on type
  if (passenger.idNumber) {
    const idValid = validateIdNumber(passenger.idType, passenger.idNumber);
    if (!idValid) {
      errors.push(`Invalid ${passenger.idType} number format`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateIdNumber(idType: string, idNumber: string): boolean {
  switch (idType) {
    case 'AADHAAR':
      return IRCTC_VALIDATION.AADHAAR_PATTERN.test(idNumber);
    case 'PAN':
      return IRCTC_VALIDATION.PAN_PATTERN.test(idNumber);
    case 'PASSPORT':
      return IRCTC_VALIDATION.PASSPORT_PATTERN.test(idNumber);
    case 'VOTER_ID':
      return IRCTC_VALIDATION.VOTER_ID_PATTERN.test(idNumber);
    case 'DRIVING_LICENSE':
      return IRCTC_VALIDATION.DRIVING_LICENSE_PATTERN.test(idNumber);
    default:
      return true;
  }
}

export function validateJourney(journey: Journey): ValidationResult {
  const errors: string[] = [];

  if (!journey.sourceStation) {
    errors.push('Source station is required');
  }
  if (!journey.destinationStation) {
    errors.push('Destination station is required');
  }
  if (journey.sourceStation && journey.destinationStation && journey.sourceStation === journey.destinationStation) {
    errors.push('Source and destination cannot be the same');
  }
  if (!journey.journeyDate) {
    errors.push('Journey date is required');
  }
  if (!journey.trainNumber) {
    errors.push('Train number is required');
  } else if (!/^\d{5}$/.test(journey.trainNumber)) {
    errors.push('Train number must be 5 digits');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBookingTemplate(journey: Journey, passengers: Passenger[]): ValidationResult {
  const errors: string[] = [];

  // Validate journey
  const journeyResult = validateJourney(journey);
  errors.push(...journeyResult.errors);

  // Validate passenger count
  if (passengers.length === 0) {
    errors.push('At least one passenger is required');
  } else if (passengers.length > IRCTC_VALIDATION.MAX_PASSENGERS_TATKAL) {
    errors.push(`Maximum ${IRCTC_VALIDATION.MAX_PASSENGERS_TATKAL} passengers allowed for Tatkal`);
  }

  // Validate each passenger
  passengers.forEach((p, i) => {
    const result = validatePassenger(p);
    result.errors.forEach((e) => errors.push(`Passenger ${i + 1}: ${e}`));
  });

  return { valid: errors.length === 0, errors };
}
