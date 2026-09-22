// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Combobox, Group, Loader, Text, TextInput, useCombobox } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { formatHumanName } from '@medplum/core';
import type { HumanName, Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { MRN_SYSTEM, patientAge, patientMrn } from '../../fhir/patient';

/**
 * Header search over patients by name or MRN. Debounced, and issues the same
 * FHIR searches the rest of the app uses — no new data model.
 */
export function GlobalPatientSearch(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const combobox = useCombobox();

  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 250);
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // An MRN-looking term searches the identifier; anything else searches name.
    const looksLikeMrn = /\d/.test(term);
    const params = looksLikeMrn
      ? { identifier: `${MRN_SYSTEM}|${term}`, _count: 8 }
      : { name: term, _count: 8 };

    medplum
      .searchResources('Patient', params)
      .then((found) => {
        if (cancelled) {
          return;
        }
        // An MRN search that misses falls back to a name search, so a partial
        // MRN typed into the box still turns something up.
        if (found.length === 0 && looksLikeMrn) {
          return medplum.searchResources('Patient', { name: term, _count: 8 }).then((byName) => {
            if (!cancelled) {
              setResults([...byName]);
            }
          });
        }
        setResults([...found]);
        return undefined;
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [medplum, debounced]);

  function handleSelect(id: string): void {
    setQuery('');
    setResults([]);
    combobox.closeDropdown();
    navigate(`/Patient/${id}`)?.catch(console.error);
  }

  const options = results.map((patient) => (
    <Combobox.Option value={patient.id as string} key={patient.id}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="sm" fw={500} truncate>
          {patient.name?.[0] ? formatHumanName(patient.name[0] as HumanName) : 'Unnamed patient'}
        </Text>
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {patientMrn(patient) ?? '—'}
          {patientAge(patient) !== undefined ? ` · ${patientAge(patient)}y` : ''}
        </Text>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Combobox store={combobox} withinPortal onOptionSubmit={handleSelect}>
      <Combobox.Target>
        <TextInput
          placeholder="Search patients by name or MRN"
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          leftSection={<IconSearch size={16} />}
          rightSection={loading ? <Loader size={14} /> : null}
          aria-label="Search patients by name or MRN"
          styles={{ input: { background: 'var(--care-surface-card)' } }}
        />
      </Combobox.Target>
      <Combobox.Dropdown hidden={query.trim().length < 2}>
        <Combobox.Options>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>{loading ? 'Searching…' : 'No matching patients'}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
