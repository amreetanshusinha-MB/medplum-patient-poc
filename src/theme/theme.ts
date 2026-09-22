// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * The Mantine theme, built entirely from ./tokens. Wired into MantineProvider
 * in src/main.tsx.
 */
import { createTheme } from '@mantine/core';
import {
  FONT_FAMILY,
  RADIUS,
  SHADOWS,
  SPACING,
  SURFACE,
  TEXT,
  accentTuple,
  dangerTuple,
  grayTuple,
  neutralTuple,
  primaryTuple,
  successTuple,
  warningTuple,
} from './tokens';

export const theme = createTheme({
  fontFamily: FONT_FAMILY,
  headings: {
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.3' },
      h2: { fontSize: '1.25rem', lineHeight: '1.35' },
      h3: { fontSize: '1.125rem', lineHeight: '1.4' },
      h4: { fontSize: '1rem', lineHeight: '1.45' },
    },
  },

  colors: {
    brand: primaryTuple,
    accent: accentTuple,
    // Override Mantine's defaults so status colours are ours, and semantic.
    red: dangerTuple,
    yellow: warningTuple,
    green: successTuple,
    gray: grayTuple,
    // Reserved for the Restricted (403) panel.
    neutral: neutralTuple,
  },

  primaryColor: 'brand',
  // #1D4ED8 sits at index 7 of the brand ramp; pin to it so the supplied hex
  // is what actually renders on primary surfaces.
  primaryShade: { light: 7, dark: 8 },

  defaultRadius: 'md',

  // Let Mantine pick a readable foreground on filled surfaces, so a future
  // accent-filled button cannot silently ship white-on-sky (2.77:1).
  autoContrast: true,
  luminanceThreshold: 0.3,

  radius: RADIUS,
  spacing: SPACING,
  shadows: SHADOWS,

  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '0.9375rem',
    lg: '1rem',
    xl: '1.125rem',
  },

  lineHeights: {
    xs: '1.4',
    sm: '1.45',
    md: '1.55',
    lg: '1.6',
    xl: '1.65',
  },

  other: {
    surface: SURFACE,
    text: TEXT,
  },

  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'lg',
        shadow: 'sm',
        padding: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Alert: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
  },
});
