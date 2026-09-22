// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Box, List, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconActivityHeartbeat, IconClipboardList, IconLock } from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import { PRODUCT_NAME } from '../../theme';
import { BrandMark } from '../ui/BrandMark';

const POINTS = [
  { icon: <IconClipboardList size={14} />, text: 'Registration and problem list on FHIR' },
  { icon: <IconActivityHeartbeat size={14} />, text: 'Vitals captured as coded Observations' },
  { icon: <IconLock size={14} />, text: 'Access control enforced server-side' },
];

export interface AuthLayoutProps {
  readonly children: ReactNode;
}

/**
 * Branded split layout for unauthenticated screens: product panel on the left,
 * the form on the right. Stacks to a single column on narrow viewports.
 */
export function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  return (
    <SimpleGrid
      cols={{ base: 1, md: 2 }}
      spacing={0}
      style={{ minHeight: '100vh', background: 'var(--care-surface-app)' }}
    >
      {/* Brand panel — hidden on small screens where it would push the form down. */}
      <Box
        visibleFrom="md"
        style={{
          background: 'var(--mantine-color-brand-7)',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <BrandMark onDark size={34} />

        <Stack gap="lg" maw={420}>
          <Title order={1} c="white" style={{ fontSize: '2rem', lineHeight: 1.25 }}>
            A clinical record built on FHIR, not around it.
          </Title>
          <Text c="var(--mantine-color-brand-1)" size="sm">
            {PRODUCT_NAME} stores every patient, reading and diagnosis as a standards-compliant
            FHIR resource — so the data is portable from day one.
          </Text>
          <List spacing="xs" size="sm" c="white" listStyleType="none">
            {POINTS.map((point) => (
              <List.Item
                key={point.text}
                icon={
                  <ThemeIcon size={22} radius="xl" variant="white" color="brand">
                    {point.icon}
                  </ThemeIcon>
                }
              >
                {point.text}
              </List.Item>
            ))}
          </List>
        </Stack>

        <Text size="xs" c="var(--mantine-color-brand-2)">
          Demo environment · synthetic data only
        </Text>
      </Box>

      {/* Form panel. */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <Stack gap="lg" w="100%" maw={420}>
          <Box hiddenFrom="md">
            <BrandMark size={32} />
          </Box>
          <Paper withBorder shadow="md" radius="lg" p="xl" bg="var(--care-surface-card)">
            {children}
          </Paper>
        </Stack>
      </Box>
    </SimpleGrid>
  );
}
