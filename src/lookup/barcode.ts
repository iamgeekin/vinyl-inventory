export const cleanBarcode = (input: string): string => input.replace(/\D/g, '');

/** GTIN check digit used by EAN-8, UPC-A, EAN-13 and GTIN-14. */
export function hasValidCheckDigit(code: string): boolean {
  if (![8, 12, 13, 14].includes(code.length) || /\D/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < code.length - 1; i++) {
    const fromRight = code.length - 2 - i;
    sum += Number(code[i]) * (fromRight % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

/**
 * The same product can be listed as 12-digit UPC-A or as 13-digit EAN-13 with a
 * leading zero, so both spellings are worth searching.
 */
export function barcodeVariants(input: string): string[] {
  const code = cleanBarcode(input);
  if (!code) return [];
  const variants = [code];
  if (code.length === 12) variants.push(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) variants.push(code.slice(1));
  return variants;
}
