/**
 * Core integer paise currency utilities.
 * Rule #1: Store all monetary values in integer paise (₹100.50 = 10050 paise).
 */

export function rupeesToPaise(rupees: number | string): number {
  const parsed = typeof rupees === 'string' ? Number(rupees.trim()) : rupees;
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Invalid monetary amount');
  }
  return Math.round(parsed * 100);
}

export function paiseToRupees(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise amount must be an integer');
  }
  return paise / 100;
}

export function formatINR(paise: number, options?: { showSign?: boolean; compact?: boolean }): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = absPaise / 100;
  const hasFraction = absPaise % 100 !== 0;

  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const signPrefix = isNegative ? '-' : options?.showSign && paise > 0 ? '+' : '';
  return `${signPrefix}₹${formatted}`;
}
