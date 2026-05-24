/**
 * Maryland Healthcare Telemedicine pricing constants
 * Single source of truth for client and server.
 */
export const PRICING_CONSTANTS = {
  generalPractice: 200,    // General Practice Standard WAT NGN
  mentalHealth: 15000,    // Mental Health Private Consultation NGN
};
export type PricingConstants = typeof PRICING_CONSTANTS;
