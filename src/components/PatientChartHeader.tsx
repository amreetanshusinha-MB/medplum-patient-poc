// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Avatar, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import {
  patientAgeDisplay,
  patientDob,
  patientGender,
  patientDisplayName,
  patientInitials,
  patientMrn,
} from '../fhir/patient';

interface FactProps {
  readonly label: string;
  readonly value: string;
}

function Fact({ label, value }: FactProps): JSX.Element {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.04em' }}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Stack>
  );
}

export interface PatientChartHeaderProps {
  readonly patient: Patient;
}

/**
 * The chart banner, replacing @medplum/react's `PatientHeader`: initials
 * avatar, name, MRN badge and the demographics a clinician needs at a glance.
 */
export function PatientChartHeader({ patient }: PatientChartHeaderProps): JSX.Element {
  const mrn = patientMrn(patient);
  const age = patientAgeDisplay(patient);
  const gender = patientGender(patient);
  const dob = patientDob(patient);

  return (
    <Paper withBorder shadow="sm" radius="lg" p="lg" bg="var(--care-surface-card)">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar size={56} radius="xl" color="brand" variant="light">
            <Text fw={700} fz="lg">
              {patientInitials(patient)}
            </Text>
          </Avatar>
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Title order={2} style={{ lineHeight: 1.2 }}>
              {patientDisplayName(patient)}
            </Title>
            {mrn ? (
              <Badge variant="light" color="accent" c="accent.8" size="sm" w="fit-content">
                MRN {mrn}
              </Badge>
            ) : (
              <Text size="sm" c="dimmed">
                No MRN recorded
              </Text>
            )}
          </Stack>
        </Group>

        <Group gap="xl" wrap="wrap">
          <Fact label="Age" value={age ?? '—'} />
          <Fact label="Gender" value={gender ?? '—'} />
          <Fact label="Date of birth" value={dob ?? '—'} />
        </Group>
      </Group>
    </Paper>
  );
}
