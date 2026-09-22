// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { isOperationOutcome } from '@medplum/core';
import type { JSX } from 'react';

/**
 * True when an error from the Medplum client is an access-control denial.
 *
 * A denial can surface either as a thrown OperationOutcome whose issue code is
 * `forbidden`/`security`, or as an error carrying an HTTP 403 status. Both are
 * treated the same so the UI can distinguish "not allowed to see this" from
 * "there is nothing here" — an empty panel and a forbidden panel must not look
 * alike, which is the point of the access-control demo.
 */
export function isForbidden(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }

  const candidate = err as { status?: number; outcome?: unknown };
  if (candidate.status === 403) {
    return true;
  }

  const outcome = isOperationOutcome(err) ? err : candidate.outcome;
  if (isOperationOutcome(outcome)) {
    return !!outcome.issue?.some((issue) => issue.code === 'forbidden' || issue.code === 'security');
  }

  return false;
}

/** True when a GraphQL error message describes an access-control denial. */
export function isForbiddenMessage(message: string): boolean {
  return /forbidden|not allowed|access denied|access policy/i.test(message);
}

export interface ForbiddenPanelProps {
  /**
   * The complete noun phrase for what cannot be seen, e.g. "vitals" or
   * "this patient's problem list". Slotted in as `view {what}`, so it carries
   * its own determiner.
   */
  readonly what?: string;
  readonly mb?: string;
}

/**
 * Shown in place of clinical data when the server refuses the read. Visually
 * distinct from an empty state on purpose.
 */
export function ForbiddenPanel({ what = 'this', mb }: ForbiddenPanelProps): JSX.Element {
  return (
    <Paper
      withBorder
      radius="md"
      p="lg"
      mb={mb}
      /*
       * Deliberately hue-free grey with a dashed border and a lock icon. This
       * has to read as different from three other states at a glance:
       *   - the blue product chrome   (informational, brand)
       *   - a red error Alert         (something broke)
       *   - a dimmed empty state      (nothing recorded yet)
       * Restricted means "there is data here and you may not see it", which is
       * a different clinical fact from "no data exists". Keeping that visually
       * distinct is the closing beat of the demo.
       */
      style={{
        background: 'var(--mantine-color-neutral-1)',
        borderColor: 'var(--mantine-color-neutral-3)',
        borderStyle: 'dashed',
      }}
    >
      <Group gap="md" wrap="nowrap" align="flex-start">
        <ThemeIcon size={36} radius="xl" variant="light" color="neutral">
          <IconLock size={18} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="sm" fw={600} c="var(--mantine-color-neutral-8)">
            Restricted
          </Text>
          <Text size="sm" c="var(--mantine-color-neutral-7)">
            You don&apos;t have permission to view {what}.
          </Text>
          <Text size="xs" c="var(--mantine-color-neutral-6)" mt={2}>
            Your account&apos;s access policy does not grant access to this data.
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
