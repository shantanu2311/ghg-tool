// ── Analysis Data Encryption ────────────────────────────────────────────────
// Encrypts/decrypts the sensitive analysis values (quantities, emissions, costs)
// stored in the encryptedData column. Profile data (org name, contact) stays plaintext.
//
// In the database, admins see:
//   quantity=0, spendInr=0, co2Tonnes=0 ... encryptedData="dGhpc0lz..."
// The real values are only accessible through the API (which decrypts for the authenticated user).

import { encrypt, decrypt } from '@/lib/crypto';

// ── Activity Data ──────────────────────────────────────────────────────────

interface ActivitySensitive {
  quantity: number | null;
  spendInr: number | null;
  description: string | null;
}

/**
 * Encrypt activity data sensitive fields. Returns the encrypted payload
 * and zeroed-out plaintext values for storage.
 */
export function encryptActivityData(data: {
  quantity?: number | null;
  spendInr?: number | null;
  description?: string | null;
}): { encryptedData: string | null; quantity: number | null; spendInr: number | null; description: string | null } {
  const sensitive: ActivitySensitive = {
    quantity: data.quantity ?? null,
    spendInr: data.spendInr ?? null,
    description: data.description ?? null,
  };

  return {
    encryptedData: encrypt(JSON.stringify(sensitive)),
    quantity: 0,      // zeroed in DB
    spendInr: 0,      // zeroed in DB
    description: null, // cleared in DB
  };
}

/**
 * Decrypt activity data. Restores real values from encryptedData payload.
 */
export function decryptActivityData<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = { ...row };
  const encrypted = result.encryptedData as string | null;

  if (encrypted) {
    try {
      const decrypted = decrypt(encrypted);
      if (decrypted) {
        const parsed = JSON.parse(decrypted) as ActivitySensitive;
        if (parsed.quantity !== null) result.quantity = parsed.quantity;
        if (parsed.spendInr !== null) result.spendInr = parsed.spendInr;
        if (parsed.description !== null) result.description = parsed.description;
      }
    } catch {
      // If decryption fails, return row as-is (migration safety)
    }
  }

  // Don't expose the encrypted blob to the client
  delete result.encryptedData;
  return result as T;
}

// ── Calculated Emission ────────────────────────────────────────────────────

interface EmissionSensitive {
  co2Tonnes: number;
  ch4Co2eTonnes: number;
  n2oCo2eTonnes: number;
  totalCo2eTonnes: number;
  calculationSteps: string | null;
}

/**
 * Encrypt calculated emission values.
 */
export function encryptEmissionData(data: {
  co2Tonnes: number;
  ch4Co2eTonnes: number;
  n2oCo2eTonnes: number;
  totalCo2eTonnes: number;
  calculationSteps?: string | null;
}): {
  encryptedData: string | null;
  co2Tonnes: number;
  ch4Co2eTonnes: number;
  n2oCo2eTonnes: number;
  totalCo2eTonnes: number;
  calculationSteps: string | null;
} {
  const sensitive: EmissionSensitive = {
    co2Tonnes: data.co2Tonnes,
    ch4Co2eTonnes: data.ch4Co2eTonnes,
    n2oCo2eTonnes: data.n2oCo2eTonnes,
    totalCo2eTonnes: data.totalCo2eTonnes,
    calculationSteps: data.calculationSteps ?? null,
  };

  return {
    encryptedData: encrypt(JSON.stringify(sensitive)),
    co2Tonnes: 0,
    ch4Co2eTonnes: 0,
    n2oCo2eTonnes: 0,
    totalCo2eTonnes: 0,
    calculationSteps: null,
  };
}

/**
 * Decrypt calculated emission values.
 */
export function decryptEmissionData<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = { ...row };
  const encrypted = result.encryptedData as string | null;

  if (encrypted) {
    try {
      const decrypted = decrypt(encrypted);
      if (decrypted) {
        const parsed = JSON.parse(decrypted) as EmissionSensitive;
        result.co2Tonnes = parsed.co2Tonnes;
        result.ch4Co2eTonnes = parsed.ch4Co2eTonnes;
        result.n2oCo2eTonnes = parsed.n2oCo2eTonnes;
        result.totalCo2eTonnes = parsed.totalCo2eTonnes;
        if (parsed.calculationSteps !== null) {
          result.calculationSteps = parsed.calculationSteps;
        }
      }
    } catch {
      // migration safety
    }
  }

  delete result.encryptedData;
  return result as T;
}

// ── Report ─────────────────────────────────────────────────────────────────

interface ReportSensitive {
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  scope3ByCategory: string | null;
  energyConsumedGj: number;
  renewablePercent: number | null;
  intensityPerTurnover: number | null;
  intensityPerProduct: number | null;
  intensityPerEmployee: number | null;
  dataQualityScore: number;
}

/**
 * Encrypt report sensitive fields.
 */
export function encryptReportData(data: ReportSensitive): {
  encryptedData: string | null;
} & Record<string, number | null | string> {
  return {
    encryptedData: encrypt(JSON.stringify(data)),
    scope1Total: 0,
    scope2Total: 0,
    scope3Total: 0,
    scope3ByCategory: null,
    energyConsumedGj: 0,
    renewablePercent: 0,
    intensityPerTurnover: null,
    intensityPerProduct: null,
    intensityPerEmployee: null,
    dataQualityScore: 0,
  };
}

/**
 * Decrypt report values.
 */
export function decryptReportData<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = { ...row };
  const encrypted = result.encryptedData as string | null;

  if (encrypted) {
    try {
      const decrypted = decrypt(encrypted);
      if (decrypted) {
        const parsed = JSON.parse(decrypted) as ReportSensitive;
        Object.assign(result, parsed);
      }
    } catch {
      // migration safety
    }
  }

  delete result.encryptedData;
  return result as T;
}
