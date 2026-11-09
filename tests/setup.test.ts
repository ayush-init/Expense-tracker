import { describe, expect, it } from 'vitest';
import { formatINR, paiseToRupees, rupeesToPaise } from '../src/utils/currency';

describe('Phase 1: Project Setup & Integer Paise Currency Foundation', () => {
  it('converts rupees to integer paise accurately', () => {
    expect(rupeesToPaise(100.5)).toBe(10050);
    expect(rupeesToPaise('600')).toBe(60000);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('converts integer paise to rupees and rejects floating paise', () => {
    expect(paiseToRupees(10050)).toBe(100.5);
    expect(() => paiseToRupees(100.5)).toThrow();
  });

  it('formats paise into Indian Rupee display strings', () => {
    expect(formatINR(60000)).toBe('₹600');
    expect(formatINR(10050)).toBe('₹100.50');
    expect(formatINR(-25000)).toBe('-₹250');
    expect(formatINR(25000, { showSign: true })).toBe('+₹250');
  });
});
