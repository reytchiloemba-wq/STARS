import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'test-only-encryption-key-not-for-prod';
});

const { encryptSecret, decryptSecret, DecryptionError, fingerprint, encryptCredentials, decryptCredentials } = await import(
  '@/lib/crypto'
);

describe('crypto — AES-256-GCM secret vault', () => {
  it('round-trips a plaintext secret exactly', () => {
    const plaintext = 'sk-super-secret-api-key-1234567890';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV) even for the same plaintext', () => {
    const a = encryptSecret('same-secret');
    const b = encryptSecret('same-secret');
    expect(a).not.toBe(b);
  });

  it('rejects tampered ciphertext (GCM auth tag check) instead of silently returning garbage', () => {
    const encrypted = encryptSecret('sensitive-value');
    const [iv, tag, ciphertext] = encrypted.split(':');
    const tamperedCiphertext = Buffer.from(ciphertext!, 'base64');
    tamperedCiphertext[0] = tamperedCiphertext[0]! ^ 0xff;
    const tampered = [iv, tag, tamperedCiphertext.toString('base64')].join(':');
    expect(() => decryptSecret(tampered)).toThrow(DecryptionError);
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptSecret('not-a-valid-payload')).toThrow(DecryptionError);
  });

  it('never lets decryption with a different key succeed', () => {
    const encrypted = encryptSecret('secret-under-key-A');
    const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = 'a-completely-different-key';
    expect(() => decryptSecret(encrypted)).toThrow(DecryptionError);
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it('fingerprint only ever exposes the last 4 characters', () => {
    const fp = fingerprint('sk-abcdefghijklmnopA7F2');
    expect(fp).toBe('••••••••A7F2');
    expect(fp).not.toContain('abcdefgh');
  });

  it('round-trips a full credentials object', () => {
    const creds = { appId: '12345', appSecret: 'super-secret-value' };
    const { credentialsEnc, credentialsFingerprint } = encryptCredentials(creds);
    expect(credentialsFingerprint).toBe(fingerprint('12345'));
    const decrypted = decryptCredentials(credentialsEnc);
    expect(decrypted).toEqual(creds);
  });

  it('throws a clear error when TOKEN_ENCRYPTION_KEY is missing', () => {
    const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(/TOKEN_ENCRYPTION_KEY/);
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });
});
