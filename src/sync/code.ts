// Crockford's base 32: no I, L, O or U, so a code can be read aloud and typed.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 25 characters of 5 bits each: far too many combinations to guess. */
const LENGTH = 25;

export function generateCode(): string {
  // 256 is a multiple of 32, so every character is equally likely.
  return [...crypto.getRandomValues(new Uint8Array(LENGTH))].map((b) => ALPHABET[b % 32]).join('');
}

/** Returns the code in its stored form, or null when the text is not a sync code. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return code.length === LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** Groups of five, for showing to people. */
export const formatCode = (code: string) => code.match(/.{1,5}/g)?.join('-') ?? '';
