// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Alert, Anchor, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { normalizeErrorString } from '@medplum/core';
import type { Condition, Observation } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Link, useParams } from 'react-router';
import { ForbiddenPanel, isForbidden, isForbiddenMessage } from './ForbiddenPanel';
import { SEMANTIC } from '../theme';

const LOINC_BP_PANEL = '85354-9';
const LOINC_SYSTOLIC = '8480-6';
const LOINC_DIASTOLIC = '8462-4';

/** The standalone vitals, in the order they are displayed. */
const VITAL_ROWS: { code: string; label: string; unitLabel?: string }[] = [
  { code: '8867-4', label: 'Pulse', unitLabel: 'bpm' },
  { code: '8310-5', label: 'Temperature', unitLabel: '°C' },
  { code: '8302-2', label: 'Height', unitLabel: 'cm' },
  { code: '29463-7', label: 'Weight', unitLabel: 'kg' },
];

/**
 * One query for both panels. Search parameters containing a hyphen are spelled
 * with an underscore in FHIR GraphQL, hence `clinical_status`.
 *
 * `_count: 100` on the vitals list because the newest reading for each code may
 * sit in a different batch — we scan the sorted list per code rather than
 * assuming a single encounter carries them all.
 */
const SUMMARY_QUERY = `query PatientClinicalSummary($subject: String!) {
  vitals: ObservationList(subject: $subject, category: "vital-signs", _sort: "-date", _count: 100) {
    resourceType
    id
    effectiveDateTime
    issued
    code { text coding { system code display } }
    valueQuantity { value unit }
    component {
      code { coding { system code } }
      valueQuantity { value unit }
    }
  }
  problems: ConditionList(subject: $subject, clinical_status: "active,recurrence,remission", _sort: "-recorded-date") {
    resourceType
    id
    code { text coding { display code } }
    clinicalStatus { text coding { code display } }
    onsetDateTime
    recordedDate
  }
}`;

/** Either the rows, or a marker that the server refused this slice of the query. */
type Slice<T> = T[] | 'forbidden';

interface SummaryData {
  vitals: Slice<Observation>;
  problems: Slice<Condition>;
}

interface GraphQLError {
  message: string;
  path?: (string | number)[];
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

function timeAgo(iso: string | undefined): string {
  if (!iso) {
    return 'date unknown';
  }
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    return 'date unknown';
  }
  let duration = (ms - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return RELATIVE_TIME.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return 'date unknown';
}

function formatDate(iso: string | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString();
}

/** When the reading was taken; `issued` is the fallback if no effective time. */
function observedAt(obs: Observation): string | undefined {
  return obs.effectiveDateTime ?? obs.issued;
}

function hasCode(obs: Observation, code: string): boolean {
  return !!obs.code?.coding?.some((c) => c.code === code);
}

/** The list arrives newest-first, so the first match per code is the latest. */
function latestWithCode(vitals: Observation[], code: string): Observation | undefined {
  return vitals.find((obs) => hasCode(obs, code));
}

function componentValue(obs: Observation, code: string): number | undefined {
  const match = obs.component?.find((c) => c.code?.coding?.some((coding) => coding.code === code));
  return match?.valueQuantity?.value;
}

interface Reading {
  label: string;
  value: string;
  when: string;
}

function buildReadings(vitals: Observation[]): Reading[] {
  const readings: Reading[] = [];

  // Blood pressure reads its two components rather than showing a panel row.
  const bp = latestWithCode(vitals, LOINC_BP_PANEL);
  if (bp) {
    const systolic = componentValue(bp, LOINC_SYSTOLIC);
    const diastolic = componentValue(bp, LOINC_DIASTOLIC);
    if (systolic !== undefined || diastolic !== undefined) {
      readings.push({
        label: 'Blood pressure',
        value: `${systolic ?? '—'}/${diastolic ?? '—'} mmHg`,
        when: timeAgo(observedAt(bp)),
      });
    }
  }

  for (const row of VITAL_ROWS) {
    const obs = latestWithCode(vitals, row.code);
    const value = obs?.valueQuantity?.value;
    if (obs && value !== undefined) {
      const unit = obs.valueQuantity?.unit ?? row.unitLabel ?? '';
      readings.push({
        label: row.label,
        value: `${value}${unit ? ` ${unit}` : ''}`,
        when: timeAgo(observedAt(obs)),
      });
    }
  }

  return readings;
}

function conceptLabel(concept: Condition['code'] | Condition['clinicalStatus']): string {
  if (!concept) {
    return '—';
  }
  return concept.text ?? concept.coding?.find((c) => c.display)?.display ?? concept.coding?.[0]?.code ?? '—';
}

export function ClinicalSummary(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams();

  const [data, setData] = useState<SummaryData | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;

    medplum
      .graphql(SUMMARY_QUERY, 'PatientClinicalSummary', { subject: `Patient/${id}` })
      .then((result) => {
        if (cancelled) {
          return;
        }

        // A GraphQL response can carry errors alongside a 200. An access policy
        // that denies Observation or Condition shows up here as a per-field
        // error, so each panel is marked forbidden independently rather than
        // collapsing the whole summary into one error.
        let vitalsForbidden = false;
        let problemsForbidden = false;
        const otherErrors: string[] = [];

        for (const gqlError of (result?.errors ?? []) as GraphQLError[]) {
          const field = gqlError.path?.[0];
          if (!isForbiddenMessage(gqlError.message)) {
            otherErrors.push(gqlError.message);
          } else if (field === 'vitals') {
            vitalsForbidden = true;
          } else if (field === 'problems') {
            problemsForbidden = true;
          } else {
            // A denial with no field path applies to the whole query.
            vitalsForbidden = true;
            problemsForbidden = true;
          }
        }

        if (otherErrors.length > 0) {
          setError(otherErrors.join('; '));
          return;
        }

        setData({
          vitals: vitalsForbidden ? 'forbidden' : (result?.data?.vitals ?? []),
          problems: problemsForbidden ? 'forbidden' : (result?.data?.problems ?? []),
        });
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        // A blanket 403 denies both slices at once.
        if (isForbidden(err)) {
          setData({ vitals: 'forbidden', problems: 'forbidden' });
          return;
        }
        setError(normalizeErrorString(err));
      });

    return () => {
      cancelled = true;
    };
  }, [medplum, id]);

  if (error) {
    return (
      <Alert color={SEMANTIC.error} mb="xl" title="Could not load clinical summary">
        {error}
      </Alert>
    );
  }

  if (!data) {
    return <Loader mb="xl" />;
  }

  const readings = data.vitals === 'forbidden' ? [] : buildReadings(data.vitals);

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="md">
          Latest vitals
        </Title>
        {data.vitals === 'forbidden' ? (
          <ForbiddenPanel what="vitals" />
        ) : readings.length === 0 ? (
          <Text c="dimmed" size="sm">
            No vitals recorded.{' '}
            <Anchor component={Link} to={`/Patient/${id}/vitals`}>
              Record vitals
            </Anchor>
          </Text>
        ) : (
          <Stack gap="xs">
            {readings.map((reading) => (
              <Group key={reading.label} justify="space-between" wrap="nowrap" align="baseline">
                <Text size="sm" c="dimmed">
                  {reading.label}
                </Text>
                <Group gap="xs" wrap="nowrap" align="baseline">
                  <Text size="sm" fw={600}>
                    {reading.value}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {reading.when}
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="md">
          Active problems
        </Title>
        {data.problems === 'forbidden' ? (
          <ForbiddenPanel what="this problem list" />
        ) : data.problems.length === 0 ? (
          <Text c="dimmed" size="sm">
            No problems recorded.{' '}
            <Anchor component={Link} to={`/Patient/${id}/problems`}>
              Add a problem
            </Anchor>
          </Text>
        ) : (
          <Stack gap="sm">
            {data.problems.map((problem) => {
              const onset = formatDate(problem.onsetDateTime);
              return (
                <Group key={problem.id} justify="space-between" wrap="nowrap" align="baseline">
                  <Stack gap={0}>
                    <Text size="sm" fw={600}>
                      {conceptLabel(problem.code)}
                    </Text>
                    {onset && (
                      <Text size="xs" c="dimmed">
                        Onset {onset}
                      </Text>
                    )}
                  </Stack>
                  <Text size="xs" c="dimmed">
                    {conceptLabel(problem.clinicalStatus)}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        )}
      </Card>
    </SimpleGrid>
  );
}
