// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Exposes the surface and text tokens as CSS variables, so components and CSS
 * modules can reference them without importing hex values. Tokens remain the
 * single source of truth — this only republishes them.
 */
import type { CSSVariablesResolver } from '@mantine/core';
import { SHADOWS, SURFACE, TEXT } from './tokens';

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--care-surface-app': SURFACE.app,
    '--care-surface-card': SURFACE.card,
    '--care-border': SURFACE.border,
    '--care-border-strong': SURFACE.borderStrong,
    '--care-text-primary': TEXT.primary,
    '--care-text-secondary': TEXT.secondary,
    '--care-text-muted': TEXT.muted,
    '--care-text-on-primary': TEXT.onPrimary,
    '--care-shadow-sm': SHADOWS.sm,
    '--care-shadow-md': SHADOWS.md,
  },
  light: {},
  dark: {},
});
