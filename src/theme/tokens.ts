// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * CareRecord design tokens — the single source of truth for colour, type,
 * radius, spacing and elevation. Nothing in src/ should hardcode a colour;
 * import from here (or use the Mantine theme built in ./theme.ts) instead.
 */
import type { MantineColorsTuple } from '@mantine/core';

export const PRODUCT_NAME = 'CareRecord';

/** Brand anchors, as supplied. */
export const BRAND = {
  /** Deep blue — headers, primary buttons, active nav. */
  primary: '#1D4ED8',
  /** Sky blue — highlights, links, focus rings, badges. */
  accent: '#0EA5E9',
} as const;

export const FONT_FAMILY = 'Inter, system-ui, sans-serif';

/**
 * Primary ramp, generated around BRAND.primary (#1D4ED8).
 *
 * Mantine tuples run light (0) to dark (9). #1D4ED8 sits at index 7, so
 * `primaryShade` is pinned to 7 in the theme — that way the exact supplied hex
 * is what renders on primary buttons and active nav, rather than a neighbour.
 *
 * Contrast: white on #1D4ED8 is 6.70:1 — passes WCAG AA for normal text and
 * AAA for large text.
 */
export const primaryTuple: MantineColorsTuple = [
  '#EFF6FF', // 0
  '#DBEAFE', // 1
  '#BFDBFE', // 2
  '#93C5FD', // 3
  '#60A5FA', // 4
  '#3B82F6', // 5
  '#2563EB', // 6
  '#1D4ED8', // 7  ← BRAND.primary, primaryShade
  '#1E40AF', // 8
  '#1E3A8A', // 9
];

/**
 * Accent ramp around BRAND.accent (#0EA5E9), which sits at index 5.
 *
 * Contrast warning: white on #0EA5E9 is only 2.77:1, and #0EA5E9 as text on
 * white is the same 2.77:1 — both fail AA. Verified combinations:
 *   accent-8 on accent light bg  7.09:1  PASS  ← badges use c="accent.8"
 *   accent-7 on white            5.93:1  PASS  ← accent text / links
 *   accent-6 on accent-1         3.57:1  FAIL  ← Mantine's light-variant default
 *   accent-5 on white            2.77:1  FAIL
 * So accent never carries small text at shade 5 or 6. Where an accent-filled
 * surface needs white text, use shade 7 — see ACCENT_ON_DARK_SHADE below.
 */
export const accentTuple: MantineColorsTuple = [
  '#F0F9FF', // 0
  '#E0F2FE', // 1
  '#BAE6FD', // 2
  '#7DD3FC', // 3
  '#38BDF8', // 4
  '#0EA5E9', // 5  ← BRAND.accent
  '#0284C7', // 6
  '#0369A1', // 7  ← safe for white text (5.93:1)
  '#075985', // 8
  '#0C4A6E', // 9
];

/** The accent shade that may carry white text and still pass AA. */
export const ACCENT_ON_DARK_SHADE = 7;

/**
 * Status ramps, deliberately NOT blue. In a blue-primary UI an informational
 * blue must never be mistaken for an error, so these stay conventionally
 * red / amber / green.
 */
export const dangerTuple: MantineColorsTuple = [
  '#FEF2F2',
  '#FEE2E2',
  '#FECACA',
  '#FCA5A5',
  '#F87171',
  '#EF4444',
  '#DC2626',
  '#B91C1C',
  '#991B1B',
  '#7F1D1D',
];

export const warningTuple: MantineColorsTuple = [
  '#FFFBEB',
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#D97706',
  '#B45309',
  '#92400E',
  '#78350F',
];

export const successTuple: MantineColorsTuple = [
  '#ECFDF5',
  '#D1FAE5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#059669',
  '#047857',
  '#065F46',
  '#064E3B',
];

/**
 * General UI grey. Slightly cool so it sits comfortably on the pale blue-grey
 * app background, and used for borders, secondary text and dimmed states.
 */
export const grayTuple: MantineColorsTuple = [
  '#F8FAFC',
  '#F1F5F9',
  '#E2E8F0',
  '#CBD5E1',
  '#94A3B8',
  '#64748B',
  '#475569',
  '#334155',
  '#1E293B',
  '#0F172A',
];

/**
 * Pure neutral grey, reserved for the Restricted (403) panel.
 *
 * Kept separate from `grayTuple` on purpose: the restricted state has to read
 * as visibly different from the blue UI, from red errors, and from a dimmed
 * empty state. A hue-free grey plus its own border and icon treatment is what
 * carries that distinction — it is the closing beat of the demo.
 */
export const neutralTuple: MantineColorsTuple = [
  '#FAFAFA',
  '#F5F5F5',
  '#E5E5E5',
  '#D4D4D4',
  '#A3A3A3',
  '#737373',
  '#525252',
  '#404040',
  '#262626',
  '#171717',
];

/** Surfaces. */
export const SURFACE = {
  /** App background — very pale blue-grey. */
  app: '#F5F8FC',
  /** Cards and panels. */
  card: '#FFFFFF',
  /** Card border. */
  border: '#E2E8F0',
  /** Border in a slightly stronger state (hover, active row). */
  borderStrong: '#CBD5E1',
} as const;

/** Text colours. */
export const TEXT = {
  primary: '#0F172A',
  secondary: '#475569',
  muted: '#64748B',
  onPrimary: '#FFFFFF',
} as const;

export const RADIUS = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const;

export const SPACING = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

/** Soft, low-contrast elevation — cards should read as paper, not as chrome. */
export const SHADOWS = {
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
  sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
} as const;

/** Layout dimensions used by AppLayout. */
export const LAYOUT = {
  headerHeight: 60,
  navbarWidth: 240,
} as const;

/**
 * Semantic colour roles, mapped to theme colour keys. Components reference
 * these rather than naming a colour directly, so "this is an error" and "this
 * is informational" stay decisions made in one place.
 *
 * `info` is the accent (sky) rather than the brand blue, so an informational
 * notice does not read as chrome; `error`/`warning`/`success` stay
 * conventionally red/amber/green even though the product is blue.
 */
export const SEMANTIC = {
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'accent',
  /** Reserved for the Restricted (403) state. */
  restricted: 'neutral',
} as const;
