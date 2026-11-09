/**
 * RoomSync Light Glassmorphism Design System Tokens
 * Strictly Light Theme Only — High-contrast fintech clarity with frosted glass surfaces.
 */

export const Colors = {
  // Bright ambient backgrounds & soft gradients
  background: {
    primary: '#F3F7FC',
    secondary: '#EAF1FA',
    gradientStart: '#EEF4FF',
    gradientMiddle: '#F5F8FD',
    gradientEnd: '#E8F2F8',
    orbBlue: 'rgba(59, 130, 246, 0.12)',
    orbCyan: 'rgba(6, 182, 212, 0.10)',
    orbIndigo: 'rgba(99, 102, 241, 0.08)',
  },

  // Frosted glass surfaces
  glass: {
    card: 'rgba(255, 255, 255, 0.78)',
    cardElevated: 'rgba(255, 255, 255, 0.88)',
    cardSubtle: 'rgba(255, 255, 255, 0.58)',
    cardHighlight: 'rgba(239, 246, 255, 0.84)',
    input: 'rgba(255, 255, 255, 0.86)',
    navBar: 'rgba(255, 255, 255, 0.90)',
    modalOverlay: 'rgba(15, 23, 42, 0.35)',
    border: 'rgba(255, 255, 255, 0.92)',
    borderSubtle: 'rgba(203, 213, 225, 0.55)',
    borderAccent: 'rgba(37, 99, 235, 0.28)',
  },

  // High-contrast text hierarchy
  text: {
    primary: '#0F172A',     // Slate 900 - crisp readability
    secondary: '#334155',   // Slate 700
    muted: '#64748B',       // Slate 500
    subtle: '#94A3B8',      // Slate 400
    inverse: '#FFFFFF',
    accent: '#1D4ED8',
  },

  // Brand & fintech semantic palette
  brand: {
    primary: '#2563EB',     // Royal Fintech Blue
    primaryDark: '#1D4ED8',
    primarySoft: 'rgba(37, 99, 235, 0.12)',
    secondary: '#0891B2',   // Cyan accent
    secondarySoft: 'rgba(8, 145, 178, 0.12)',
    indigo: '#4F46E5',
    indigoSoft: 'rgba(79, 70, 229, 0.12)',
  },

  // Financial semantics
  semantic: {
    positive: '#059669',        // Owed to me / Confirmed / Settled
    positiveBg: 'rgba(5, 150, 105, 0.12)',
    positiveBorder: 'rgba(5, 150, 105, 0.28)',

    negative: '#DC2626',        // I owe / Disputed / Voided
    negativeBg: 'rgba(220, 38, 38, 0.12)',
    negativeBorder: 'rgba(220, 38, 38, 0.28)',

    warning: '#D97706',         // Pending / Partial settlement / Skipped meal
    warningBg: 'rgba(217, 119, 6, 0.13)',
    warningBorder: 'rgba(217, 119, 6, 0.30)',

    info: '#0284C7',
    infoBg: 'rgba(2, 132, 199, 0.12)',
    infoBorder: 'rgba(2, 132, 199, 0.28)',
  },

  // Roommate distinct avatar palette
  members: {
    ayush: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD', accent: '#2563EB' },
    yuvraj: { bg: '#CCFBF1', text: '#0F766E', border: '#5EEAD4', accent: '#0D9488' },
    vansh: { bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC', accent: '#4F46E5' },
    default: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', accent: '#475569' },
  },
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const Radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
  pill: 9999,
} as const;

export const Typography = {
  heroAmount: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.6 },
  h1: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.2 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.9 },
} as const;

export const Shadows = {
  glass: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
} as const;

export function getMemberPalette(name: string) {
  const key = name.trim().toLowerCase();
  if (key.includes('ayush')) return Colors.members.ayush;
  if (key.includes('yuvraj')) return Colors.members.yuvraj;
  if (key.includes('vansh')) return Colors.members.vansh;
  return Colors.members.default;
}
