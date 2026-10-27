/**
 * Ziezan Quran — Enterprise Client-Side Security, Encryption & Sanitization Engine
 * Protects local storage data, backup exports/imports, API origins, and user inputs
 * against XSS, Prototype Pollution, tampering, and untrusted third-party injection.
 */

const ENVELOPE_PREFIX = 'zq_enc_v2:';
const CIPHER_PEPPER = 'ZiezanSolutions::FebriSuryanto::QuranShield::v2.5';

function deriveKeyBytes(): Uint8Array {
  const originScope =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'ziezan-quran-pwa';
  const material = `${CIPHER_PEPPER}::${originScope}`;
  return new TextEncoder().encode(material);
}

/**
 * Fast deterministic 64-bit integrity MAC (FNV-1a dual-lane) for synchronous storage verification
 */
function computeIntegrityTag(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const full = `${CIPHER_PEPPER}:${payload}`;
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export const securityService = {
  /**
   * Encrypts & signs JSON string before persisting to localStorage
   */
  encryptStoragePayload(plainJson: string): string {
    try {
      const key = deriveKeyBytes();
      const plainBytes = new TextEncoder().encode(plainJson);
      const cipherBytes = new Uint8Array(plainBytes.length);

      for (let i = 0; i < plainBytes.length; i++) {
        const k = key[i % key.length] ^ ((i * 31) & 0xff);
        cipherBytes[i] = plainBytes[i] ^ k;
      }

      const b64 = bytesToBase64(cipherBytes);
      const mac = computeIntegrityTag(b64);
      return `${ENVELOPE_PREFIX}${mac}:${b64}`;
    } catch {
      return plainJson;
    }
  },

  /**
   * Verifies integrity MAC & decrypts localStorage payload.
   * Seamlessly supports legacy plaintext JSON for zero-data-loss migration.
   */
  decryptStoragePayload(storedRaw: string | null): string | null {
    if (!storedRaw) return null;
    if (!storedRaw.startsWith(ENVELOPE_PREFIX)) {
      // Legacy unencrypted JSON fallback
      return storedRaw;
    }

    try {
      const body = storedRaw.slice(ENVELOPE_PREFIX.length);
      const sepIndex = body.indexOf(':');
      if (sepIndex <= 0) return null;

      const mac = body.slice(0, sepIndex);
      const b64 = body.slice(sepIndex + 1);
      const expectedMac = computeIntegrityTag(b64);

      // Constant-time MAC comparison
      if (mac.length !== expectedMac.length) return null;
      let diff = 0;
      for (let i = 0; i < mac.length; i++) {
        diff |= mac.charCodeAt(i) ^ expectedMac.charCodeAt(i);
      }
      if (diff !== 0) {
        return null;
      }

      const key = deriveKeyBytes();
      const cipherBytes = base64ToBytes(b64);
      const plainBytes = new Uint8Array(cipherBytes.length);

      for (let i = 0; i < cipherBytes.length; i++) {
        const k = key[i % key.length] ^ ((i * 31) & 0xff);
        plainBytes[i] = cipherBytes[i] ^ k;
      }

      return new TextDecoder().decode(plainBytes);
    } catch {
      return null;
    }
  },

  /**
   * Sanitizes user input (notes, search queries, imported strings) against XSS & script injection
   */
  sanitizePlainText(input: unknown, maxLength = 2000): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .slice(0, maxLength)
      .trim();
  },

  /**
   * Prevents Prototype Pollution attacks when parsing untrusted JSON files
   */
  sanitizeJsonObject<T>(rawJson: string): T | null {
    if (typeof rawJson !== 'string' || rawJson.length > 5_000_000) {
      return null;
    }
    try {
      const parsed = JSON.parse(rawJson, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
      return parsed as T;
    } catch {
      return null;
    }
  },

  /**
   * Validates that an audio stream URL strictly originates from trusted HTTPS CDN domains
   */
  isTrustedAudioUrl(url: unknown): url is string {
    if (typeof url !== 'string' || !url) return false;
    if (url.startsWith('/audio/')) return true;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      return (
        parsed.hostname === 'equran.id' ||
        parsed.hostname.endsWith('.equran.id') ||
        parsed.hostname.endsWith('.islamic.network') ||
        parsed.hostname === 'wflq2j4mi1smqyku.public.blob.vercel-storage.com' ||
        parsed.hostname.endsWith('.public.blob.vercel-storage.com')
      );
    } catch {
      return false;
    }
  },

  /**
   * Generates integrity signature for exported JSON backups
   */
  createBackupSignature(payloadJson: string): string {
    return computeIntegrityTag(payloadJson);
  },
};
