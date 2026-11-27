/**
 * Everything is encrypted on the device with a key made from the sync code. The
 * database only ever sees a fingerprint of the code and scrambled bytes.
 */
export interface Vault {
  /** Names the collection in the database. The code cannot be worked out from it. */
  id: string;
  key: CryptoKey;
}

export interface Sealed {
  iv: Uint8Array<ArrayBuffer>;
  data: Uint8Array<ArrayBuffer>;
}

const encoder = new TextEncoder();

export async function deriveVault(code: string): Promise<Vault> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`vinyl-inventory vault id v1:${code}`));
  const material = await crypto.subtle.importKey('raw', encoder.encode(code), 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('vinyl-inventory'), info: encoder.encode('records v1') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const id = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { id, key };
}

/** `label` ties the result to one place, so stored items cannot be swapped around. */
export async function seal(key: CryptoKey, label: string, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(label) },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return { iv, data: new Uint8Array(data) };
}

/** Throws when the key or label is wrong, or the bytes were altered. */
export async function unseal(key: CryptoKey, label: string, sealed: Sealed): Promise<unknown> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sealed.iv, additionalData: encoder.encode(label) },
    key,
    sealed.data,
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
