// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Box, Container, Paper, Stack, Text, Title } from '@mantine/core';
import type { JSX, ReactNode } from 'react';

export interface PageProps {
  /** Optional page heading. */
  readonly title?: string;
  /** Optional supporting line under the heading. */
  readonly description?: string;
  /** Action slot, right-aligned against the heading. */
  readonly action?: ReactNode;
  /** Constrain content width; `false` fills the available space. */
  readonly maw?: number | false;
  /** Render children directly on the app background instead of on a card. */
  readonly bare?: boolean;
  readonly children: ReactNode;
}

/**
 * The themed page container, replacing @medplum/react's `Document`. Gives every
 * screen the same width, padding and card treatment so pages do not drift.
 */
export function Page({ title, description, action, maw = 960, bare = false, children }: PageProps): JSX.Element {
  const heading = (title || description || action) && (
    <Stack gap={4} mb={bare ? 'lg' : 'md'}>
      <Box style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <Box style={{ minWidth: 0 }}>
          {title && (
            <Title order={2} c="var(--care-text-primary)">
              {title}
            </Title>
          )}
          {description && (
            <Text size="sm" c="dimmed" mt={2}>
              {description}
            </Text>
          )}
        </Box>
        {action && <Box style={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    </Stack>
  );

  const body = bare ? (
    <>
      {heading}
      {children}
    </>
  ) : (
    <Paper withBorder shadow="sm" radius="lg" p="xl" bg="var(--care-surface-card)">
      {heading}
      {children}
    </Paper>
  );

  return (
    <Container size={maw === false ? undefined : maw} px={0} mx={maw === false ? 0 : undefined} maw={maw === false ? '100%' : maw}>
      {body}
    </Container>
  );
}
