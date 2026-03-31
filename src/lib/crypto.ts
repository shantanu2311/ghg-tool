// ── Field-Level Encryption (AES-256-GCM) ──────────────────────────────────
// Encrypts PII fields before storing in DB. Even with direct DB access,
// user data is unreadable without the ENCRYPTION_KEY env var.
//
// Format: base64(iv:ciphertext:authTag) — single string, safe for Prisma text fields.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY env var is required');
  // Accept hex (64 chars) or base64 (44 chars)
  if (key.length === 64) return Buffer.from(key, 'hex');
  if (key.length === 44) return Buffer.from(key, 'base64');
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
}

/**
 * Encrypt a plaintext string. Returns null if input is null/undefined.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack as: iv + ciphertext + tag, then base64
  const packed = Buffer.concat([iv, encrypted, tag]);
  return packed.toString('base64');
}

/**
 * Decrypt an encrypted string. Returns null if input is null/undefined.
 * Returns the original string if it doesn't look like our encrypted format.
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === '') return null;

  try {
    const key = getKey();
    const packed = Buffer.from(ciphertext, 'base64');

    // Minimum length: IV (12) + at least 1 byte + tag (16) = 29
    if (packed.length < IV_LENGTH + 1 + TAG_LENGTH) {
      return ciphertext; // Not encrypted, return as-is (migration safety)
    }

    const iv = packed.subarray(0, IV_LENGTH);
    const tag = packed.subarray(packed.length - TAG_LENGTH);
    const encrypted = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // If decryption fails, assume it's plaintext (migration safety)
    return ciphertext;
  }
}

/**
 * Encrypt an object's specified fields. Returns a new object with encrypted values.
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[field as string] = encrypt(val);
    }
  }
  return result;
}

/**
 * Decrypt an object's specified fields. Returns a new object with decrypted values.
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[field as string] = decrypt(val);
    }
  }
  return result;
}
