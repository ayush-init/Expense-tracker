import { describe, expect, it } from 'vitest';
import { Colors, getMemberPalette, Radii, Spacing } from '../src/theme/tokens';
import { buildMonthGrid, formatYYYYMMDD } from '../src/utils/calendar';

describe('Phase 2: Light Glassmorphism Design System & Calendar Utilities', () => {
  it('enforces bright light-theme-only background and high-contrast text tokens', () => {
    expect(Colors.background.primary).toBe('#F3F7FC');
    expect(Colors.text.primary).toBe('#0F172A');
    expect(Colors.glass.card).toContain('rgba(255, 255, 255');
  });

  it('assigns distinct palettes for Ayush, Yuvraj, and Vansh', () => {
    const ayush = getMemberPalette('Ayush');
    const yuvraj = getMemberPalette('Yuvraj');
    const vansh = getMemberPalette('Vansh');

    expect(ayush.accent).not.toBe(yuvraj.accent);
    expect(yuvraj.accent).not.toBe(vansh.accent);
    expect(ayush.accent).not.toBe(vansh.accent);
  });

  it('formats calendar dates and builds month grid deterministically', () => {
    expect(formatYYYYMMDD(2026, 0, 5)).toBe('2026-01-05');
    expect(formatYYYYMMDD(2026, 10, 12)).toBe('2026-11-12');
    const nov2026 = buildMonthGrid(2026, 10);
    expect(nov2026.filter((c) => c.day !== null).length).toBe(30);
    expect(Spacing.md).toBe(16);
    expect(Radii.xl).toBe(24);
  });
});
