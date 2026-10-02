import { EeuCustodyPhase, EeuRechargeDetails } from '../types';

export interface EeuStepConfig {
  phase: EeuCustodyPhase;
  label: 'WITH_CUSTOMER' | 'WITH_RIDER' | 'AT_EEU_HUB' | 'RETURNED';
  stepIndex: number; // 1 to 5
  title: string;
  description: string;
  actor: 'CUSTOMER' | 'RIDER' | 'EEU_TELLER';
  icon: string;
}

export const EEU_STATE_CHAIN: EeuStepConfig[] = [
  {
    phase: 'WITH_CUSTOMER',
    label: 'WITH_CUSTOMER',
    stepIndex: 1,
    title: 'Physical Card with Customer',
    description: 'Smart card & cash float prepared at customer residence awaiting Rider dispatch.',
    actor: 'CUSTOMER',
    icon: 'User'
  },
  {
    phase: 'WITH_RIDER_OUTBOUND',
    label: 'WITH_RIDER',
    stepIndex: 2,
    title: 'Rider In Transit to EEU Hub',
    description: 'Physical card & cash float collected by Rider in sealed security pouch, traveling to EEU terminal.',
    actor: 'RIDER',
    icon: 'Bike'
  },
  {
    phase: 'AT_EEU_HUB',
    label: 'AT_EEU_HUB',
    stepIndex: 3,
    title: 'At EEU District Hub Terminal',
    description: 'Rider present at Ethiopian Electric Utility counter. Smart chip being charged and official paper receipt printed.',
    actor: 'EEU_TELLER',
    icon: 'Zap'
  },
  {
    phase: 'WITH_RIDER_RETURN',
    label: 'WITH_RIDER',
    stepIndex: 4,
    title: 'Rider Returning Card & Receipt',
    description: 'Terminal receipt validated. Rider carrying charged card and paper receipt back to customer address.',
    actor: 'RIDER',
    icon: 'Bike'
  },
  {
    phase: 'RETURNED',
    label: 'RETURNED',
    stepIndex: 5,
    title: 'Returned to Customer Hands',
    description: 'Physical card handed back to customer with official EEU terminal paper receipt. Order completed.',
    actor: 'CUSTOMER',
    icon: 'CheckCircle2'
  }
];

export const EEU_HUBS = [
  { id: 'hub_jijiga_main', name: 'EEU Jijiga Main District Office (Keleb)', address: 'Near Regional Admin Complex, Keleb Sector' },
  { id: 'hub_jijiga_taiwan', name: 'EEU Taiwan Market Commercial Station', address: 'Taiwan Market Commercial Center, Jijiga' },
  { id: 'hub_jijiga_airport', name: 'EEU Garaad Wiilwaal District Kiosk', address: 'Airport Road Sub-center' },
  { id: 'hub_diredawa_central', name: 'EEU Dire Dawa Regional Operations Hub', address: 'Kezira Business Sector, Dire Dawa' }
];

/**
 * Validates Ethiopian Electric Utility 13-digit meter number.
 * Example format: "0142-8839-1029-3" or "0142883910293".
 */
export function validateMeterNumber(meterNumber: string): { isValid: boolean; cleaned: string; formatted: string } {
  const cleaned = meterNumber.replace(/\D/g, '');
  const isValid = cleaned.length === 13;
  
  // Format as 4-4-4-1
  let formatted = cleaned;
  if (cleaned.length === 13) {
    formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }

  return { isValid, cleaned, formatted };
}

/**
 * Deterministic next phase mapping along the exact 5-step lifecycle:
 * WITH_CUSTOMER -> WITH_RIDER -> AT_EEU_HUB -> WITH_RIDER -> RETURNED
 */
export function getNextEeuPhase(currentPhase: EeuCustodyPhase): EeuCustodyPhase | null {
  switch (currentPhase) {
    case 'WITH_CUSTOMER':
      return 'WITH_RIDER_OUTBOUND';
    case 'WITH_RIDER_OUTBOUND':
      return 'AT_EEU_HUB';
    case 'AT_EEU_HUB':
      return 'WITH_RIDER_RETURN';
    case 'WITH_RIDER_RETURN':
      return 'RETURNED';
    case 'RETURNED':
      return null;
    default:
      return null;
  }
}

/**
 * Enforce strict transition rules:
 * - Rider CANNOT advance to 'RETURNED' without capturing the mandatory EEU terminal paper receipt.
 */
export function validateEeuTransition(
  currentDetails: EeuRechargeDetails,
  nextPhase: EeuCustodyPhase
): { allowed: boolean; reason?: string } {
  // Check sequence validity
  const validNext = getNextEeuPhase(currentDetails.custodyPhase);
  if (validNext !== nextPhase) {
    return { 
      allowed: false, 
      reason: `Invalid state jump from ${currentDetails.custodyPhase} to ${nextPhase}. Follow custody protocol.` 
    };
  }

  // Camera receipt mandatory rule when advancing from AT_EEU_HUB to WITH_RIDER_RETURN or RETURNED
  if ((nextPhase === 'WITH_RIDER_RETURN' || nextPhase === 'RETURNED') && !currentDetails.receiptImageUrl) {
    return {
      allowed: false,
      reason: 'Mandatory Terminal Receipt Missing: You must snap a photo of the EEU terminal paper receipt before advancing custody.'
    };
  }

  return { allowed: true };
}

/**
 * Calculate estimated kWh units based on standard EEU domestic tariff (~1.85 ETB/kWh with tiered VAT)
 */
export function calculateEstimatedUnits(birrAmount: number): number {
  if (birrAmount <= 0) return 0;
  // Approximation of Ethiopian residential tariff tier
  const effectiveTariffPerKwh = 2.15;
  return Math.round((birrAmount / effectiveTariffPerKwh) * 10) / 10;
}
