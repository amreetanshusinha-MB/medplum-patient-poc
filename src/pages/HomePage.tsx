// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import {
  Alert,
  Badge,
  Button,
  Group,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { normalizeErrorString } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { IconSearch, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { Page } from '../components/ui/Page';
import { ForbiddenPanel, isForbidden } from '../components/ForbiddenPanel';
import { MRN_SYSTEM, patientAge, patientDisplayName, patientGender, patientLastUpdated, patientMrn } from '../fhir/patient';
import { SEMANTIC } from '../theme';

const PAGE_SIZE = 10;

export function HomePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 250);
  const [page, setPage] = useState(1);

  const [patients, setPatients] = useState<Patient[] | undefined>();
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [forbidden, setForbidden] = useState(false);

  // A new search term resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const load = useCallback(async (): Promise<void> => {
    setPatients(undefined);
    setError(undefined);

    const term = debounced.trim();
    // Digits suggest an MRN; anything else is treated as a name.
    const filter = term ? (/\d/.test(term) ? { identifier: `${MRN_SYSTEM}|${term}` } : { name: term }) : {};

    try {
      const bundle = await medplum.search('Patient', {
        ...filter,
        _count: PAGE_SIZE,
        _offset: (page - 1) * PAGE_SIZE,
        _sort: '-_lastUpdated',
        _total: 'accurate',
      });

      setPatients((bundle.entry ?? []).map((entry) => entry.resource as Patient).filter(Boolean));
      setTotal(bundle.total ?? 0);
    } catch (err) {
      if (isForbidden(err)) {
        setForbidden(true);
        setPatients([]);
        return;
      }
      setError(normalizeErrorString(err));
      setPatients([]);
    }
  }, [medplum, debounced, page]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const action = (
    <Button leftSection={<IconUserPlus size={16} />} onClick={() => navigate('/register')?.catch(console.error)}>
      Register patient
    </Button>
  );

  if (forbidden) {
    return (
      <Page title="Patients" action={action}>
        <ForbiddenPanel what="the patient list" />
      </Page>
    );
  }

  return (
    <Page title="Patients" description="Search by name or MRN." action={action} maw={1100}>
      <Stack gap="md">
        <TextInput
          placeholder="Filter by name or MRN"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          aria-label="Filter patients by name or MRN"
          maw={360}
        />

        {error && (
          <Alert color={SEMANTIC.error} title="Could not load patients">
            {error}
          </Alert>
        )}

        {patients === undefined ? (
          <Stack gap="xs">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={44} radius="md" />
            ))}
          </Stack>
        ) : patients.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon size={44} radius="xl" variant="light" color="gray">
              <IconUsers size={22} />
            </ThemeIcon>
            <Text fw={500}>{debounced.trim() ? 'No matching patients' : 'No patients yet'}</Text>
            <Text size="sm" c="dimmed" ta="center" maw={360}>
              {debounced.trim()
                ? 'Try a different name, or the full MRN.'
                : 'Register a patient, or run the seed script to populate demo data.'}
            </Text>
          </Stack>
        ) : (
          <>
            <Table.ScrollContainer minWidth={680}>
              <Table highlightOnHover striped stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>MRN</Table.Th>
                    <Table.Th>Age</Table.Th>
                    <Table.Th>Gender</Table.Th>
                    <Table.Th>Last updated</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {patients.map((patient) => {
                    const age = patientAge(patient);
                    return (
                      <Table.Tr
                        key={patient.id}
                        onClick={() => navigate(`/Patient/${patient.id}`)?.catch(console.error)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {patientDisplayName(patient)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {patientMrn(patient) ? (
                            <Badge variant="light" color="accent" c="accent.8" size="sm">
                              {patientMrn(patient)}
                            </Badge>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{age !== undefined ? `${age}y` : '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{patientGender(patient) ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {patientLastUpdated(patient) ?? '—'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Group justify="space-between" wrap="wrap" gap="sm">
              <Text size="sm" c="dimmed">
                {total > 0
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
                  : `${patients.length} shown`}
              </Text>
              {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />}
            </Group>
          </>
        )}
      </Stack>
    </Page>
  );
}
