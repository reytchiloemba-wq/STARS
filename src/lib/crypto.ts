import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

// Real AES-256-GCM encryption at rest for third-party secrets (Meta/LinkedIn/X
// app secrets, AI provider keys, social account tokens). Never store, log, or
// return plaintext after the initial write — see GlobalIntegration and
// SocialAccount in prisma/schema.prisma, both of which only ever expose a
// masked fingerprint to callers.
//
// TOKEN_ENCRYPTION_KEY is stretched into a 32-byte key via scrypt so any
// non-empty passphrase works; the raw env value is never used directly as
// key material.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function deriveKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not set — required to encrypt/decrypt any stored credential. See .env.example.',
    );
  }
  return scryptSync(secret, 'stars-credential-vault', 32);
}

/** Encrypt a plaintext string. Output format: base64(iv):base64(authTag):base64(ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export class DecryptionError extends Error {
  constructor(message = 'Failed to decrypt secret — wrong key or tampered ciphertext.') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/** Decrypt a string produced by `encryptSecret`. Throws DecryptionError if the key is wrong or the ciphertext was tampered with (GCM auth tag check). */
export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) throw new DecryptionError('Malformed ciphertext payload.');
  const [ivB64, authTagB64, ciphertextB64] = parts;

  try {
    const key = deriveKey();
    const iv = Buffer.from(ivB64!, 'base64');
    const authTag = Buffer.from(authTagB64!, 'base64');
    const ciphertext = Buffer.from(ciphertextB64!, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (err) {
    if (err instanceof Error && err.message.includes('TOKEN_ENCRYPTION_KEY')) throw err;
    throw new DecryptionError();
  }
}

/** Masked display fingerprint, e.g. "••••••••A7F2" — never enough to reconstruct the secret. */
export function fingerprint(plaintext: string): string {
  const last4 = plaintext.slice(-4).toUpperCase();
  return `••••••••${last4}`;
}

/** Encrypt an arbitrary JSON-serializable credentials object in one step. */
export function encryptCredentials(credentials: Record<string, string>): { credentialsEnc: string; credentialsFingerprint: string } {
  const serialized = JSON.stringify(credentials);
  const primaryValue = Object.values(credentials)[0] ?? '';
  return {
    credentialsEnc: encryptSecret(serialized),
    credentialsFingerprint: fingerprint(primaryValue),
  };
}

export function decryptCredentials<T extends Record<string, string> = Record<string, string>>(credentialsEnc: string): T {
  return JSON.parse(decryptSecret(credentialsEnc)) as T;
}
