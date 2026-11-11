// Shared TypeScript interfaces for Tatkal Booking Assistant

export type ClassType = '2A' | '3A' | 'SL' | 'CC' | 'EC';
export type QuotaType = 'TQ' | 'PT';
export type TatkalType = 'AC' | 'NON_AC';
export type Gender = 'M' | 'F' | 'T';
export type BerthPreference = 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'NONE';
export type IdType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'VOTER_ID' | 'DRIVING_LICENSE';
export type CaptchaProvider = '2CAPTCHA' | 'ANTI_CAPTCHA';

export type BookingStatus =
  | 'IDLE'
  | 'ARMED'
  | 'LOGGING_IN'
  | 'LOGGED_IN'
  | 'SEARCHING'
  | 'SELECTING_TRAIN'
  | 'FILLING_PASSENGERS'
  | 'SOLVING_CAPTCHA'
  | 'SUBMITTING'
  | 'PAYING'
  | 'CONFIRMED'
  | 'FAILED';

export type PageType =
  | 'LOGIN'
  | 'SEARCH'
  | 'TRAIN_LIST'
  | 'PASSENGER_FORM'
  | 'REVIEW_BOOKING'
  | 'PAYMENT'
  | 'CONFIRMATION'
  | 'ERROR'
  | 'UNKNOWN';

export type ErrorType =
  | 'HEAVY_LOAD'
  | 'SESSION_EXPIRED'
  | 'CAPTCHA_FAILED'
  | 'NETWORK_ERROR'
  | 'TRAIN_UNAVAILABLE'
  | 'UNKNOWN';

export interface Journey {
  id: string;
  sourceStation: string;
  destinationStation: string;
  journeyDate: string;
  trainNumber: string;
  trainName?: string;
  classType: ClassType;
  quotaType: QuotaType;
  tatkalType: TatkalType;
  boardingStation?: string;
  createdAt: string;
}

export interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  berthPreference: BerthPreference;
  idType: IdType;
  idNumber: string;
  nationality: string;
  foodChoice?: 'VEG' | 'NON_VEG' | 'NO_FOOD';
}

export interface BookingTemplate {
  id: string;
  name: string;
  journey: Journey;
  passengers: Passenger[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface BookingSession {
  id: string;
  journeyId: string;
  status: BookingStatus;
  currentStep: PageType;
  retryCount: number;
  captchaSolveCount: number;
  startedAt?: string;
  completedAt?: string;
  pnrNumber?: string;
  errorLog: string[];
}

export interface EncryptedCredentials {
  encryptedUsername: string;
  encryptedPassword: string;
  salt: string;
  iv: string;
  iterations: number;
}

export interface CaptchaConfig {
  serviceProvider: CaptchaProvider;
  apiKey: string;
  maxWaitTime: number;
  pollInterval: number;
}

export interface AppSettings {
  masterPasswordHash: string;
  autoLoginTime: string;
  ntpOffset: number;
  armed: boolean;
  activeTemplateId?: string;
}

// Extension messaging types
export type MessageType =
  | 'SAVE_CREDENTIALS'
  | 'SAVE_TEMPLATE'
  | 'SAVE_CAPTCHA_CONFIG'
  | 'ARM_BOOKING'
  | 'DISARM_BOOKING'
  | 'GET_STATUS'
  | 'UNLOCK'
  | 'TEST_NOW'
  | 'START_LOGIN'
  | 'START_SEARCH'
  | 'SELECT_TRAIN'
  | 'FILL_PASSENGERS'
  | 'SOLVE_CAPTCHA'
  | 'FILL_CAPTCHA'
  | 'REVIEW_BOOKING'
  | 'SELECT_PAYMENT'
  | 'CLICK_SUBMIT'
  | 'PAGE_CHANGED'
  | 'ERROR_DETECTED'
  | 'BOOKING_CONFIRMED'
  | 'CAPTCHA_DETECTED'
  | 'STATUS_UPDATE'
  | 'BOOKING_RESULT';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  requestId?: string;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  requestId?: string;
}

export interface StatusUpdate {
  step: BookingStatus;
  message: string;
  timestamp: string;
  retryCount?: number;
}
