// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Group, Text, ThemeIcon } from '@mantine/core';
import { IconMedicalCross } from '@tabler/icons-react';
import type { JSX } from 'react';
import { PRODUCT_NAME } from '../../theme';

export interface BrandMarkProps {
  /** Rendered size of the icon box. */
  readonly size?: number;
  /** Hide the wordmark and show only the icon (narrow viewports). */
  readonly iconOnly?: boolean;
  /** Render the wordmark in white, for use on the primary-coloured header. */
  readonly onDark?: boolean;
}

/**
 * The CareRecord wordmark: a medical-cross icon plus the product name. Text
 * wordmark by design — there is no logo asset.
 */
export function BrandMark({ size = 30, iconOnly = false, onDark = false }: BrandMarkProps): JSX.Element {
  return (
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon size={size} radius="md" variant={onDark ? 'white' : 'filled'} color="brand">
        <IconMedicalCross size={size * 0.62} stroke={2.2} />
      </ThemeIcon>
      {!iconOnly && (
        <Text
          fz="lg"
          fw={700}
          c={onDark ? 'white' : 'brand'}
          style={{ letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          {PRODUCT_NAME}
        </Text>
      )}
    </Group>
  );
}
