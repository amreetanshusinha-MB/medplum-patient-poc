// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Alert, Button, Divider, Group, Loader, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { createReference, normalizeErrorString } from '@medplum/core';
import type { CodeableConcept, Condition, Patient } from '@medplum/fhirtypes';
import { CodeableConceptInput, useMedplum, useResource, useValueSetAvailability } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { ForbiddenPanel, isForbidden } from '../components/ForbiddenPanel';
import { Page } from '../components/ui/Page';
import { SEMANTIC } from '../theme';

const SNOMED = 'http://snomed.info/sct';
/** The implicit "all of SNOMED CT" value set, expanded by the terminology server. */
const SNOMED_BINDING = 'http://snomed.info/sct?fhir_vs';

const CLINICAL_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
const VERIFICATION_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';
const CATEGORY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-category';

type ClinicalStatus = 'active' | 'recurrence' | 'remission';
type VerificationStatus = 'provisional' | 'differential' | 'confirmed';
type Severity = 'mild' | 'moderate' | 'severe';

const CLINICAL_STATUS_OPTIONS: { value: ClinicalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'recurrence', label: 'Recurrence' },
  { value: 'remission', label: 'Remission' },
];

const VERIFICATION_STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'provisional', label: 'Provisional' },
  { value: 'differential', label: 'Differential' },
  { value: 'confirmed', label: 'Confirmed' },
];

const SEVERITY_CODES: Record<Severity, { code: string; display: string }> = {
  mild: { code: '255604002', display: 'Mild' },
  moderate: { code: '6736007', display: 'Moderate' },
  severe: { code: '24484000', display: 'Severe' },
};

const SEVERITY_OPTIONS = (Object.keys(SEVERITY_CODES) as Severity[]).map((value) => ({
  value,
  label: SEVERITY_CODES[value].display,
}));

/** Builds the CodeableConcept for a condition-clinical / condition-ver-status code. */
function statusConcept(system: string, code: string, display: string): CodeableConcept {
  return { coding: [{ system, code, display }], text: display };
}

function clinicalStatusConcept(status: ClinicalStatus | 'resolved'): CodeableConcept {
  const display = status.charAt(0).toUpperCase() + status.slice(1);
  return statusConcept(CLINICAL_STATUS_SYSTEM, status, display);
}

/** Best available human-readable label for a coded concept. */
function conceptLabel(concept: CodeableConcept | undefined): string {
  if (!concept) {
    return '—';
  }
  return concept.text ?? concept.coding?.find((c) => c.display)?.display ?? concept.coding?.[0]?.code ?? '—';
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export function ProblemEntry(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  // undefined while probing; false means the local server has no SNOMED
  // expansion loaded, so the coded picker is swapped for a text input.
  const snomedAvailable = useValueSetAvailability(SNOMED_BINDING);

  const [problems, setProblems] = useState<Condition[] | undefined>();
  const [code, setCode] = useState<CodeableConcept | undefined>();
  const [codeText, setCodeText] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus>('active');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('confirmed');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [error, setError] = useState<string | undefined>();
  // Tracked separately from `error`: a denial is a normal state to render, not
  // a failure to report, and must not look like an empty problem list.
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | undefined>();
  // CodeableConceptInput is uncontrolled (defaultValue), so clearing `code`
  // alone leaves the old selection on screen. Bumping this remounts it.
  const [codeInputNonce, setCodeInputNonce] = useState(0);

  const loadProblems = useCallback(async (): Promise<void> => {
    if (!id) {
      return;
    }
    try {
      const results = await medplum.searchResources('Condition', {
        subject: `Patient/${id}`,
        'clinical-status': 'active',
        _sort: '-recorded-date',
      });
      setProblems([...results]);
    } catch (err) {
      // An access policy denying Condition refuses the search.
      if (isForbidden(err)) {
        setForbidden(true);
        setProblems([]);
        return;
      }
      setError(normalizeErrorString(err));
      setProblems([]);
    }
  }, [medplum, id]);

  useEffect(() => {
    loadProblems().catch(console.error);
  }, [loadProblems]);

  function resetForm(): void {
    setCode(undefined);
    setCodeInputNonce((n) => n + 1);
    setCodeText('');
    setOnsetDate('');
    setClinicalStatus('active');
    setVerificationStatus('confirmed');
    setSeverity('');
  }

  async function handleSubmit(): Promise<void> {
    setError(undefined);

    if (!patient) {
      return;
    }

    // Either a picked concept or, in fallback mode, free text.
    const conceptCode: CodeableConcept | undefined = snomedAvailable
      ? code
      : codeText.trim()
        ? { text: codeText.trim() }
        : undefined;

    if (!conceptCode) {
      setError('Select or enter a condition before saving.');
      return;
    }

    const profile = medplum.getProfile();

    const condition: Condition = {
      resourceType: 'Condition',
      subject: createReference(patient),
      code: conceptCode,
      category: [
        {
          coding: [{ system: CATEGORY_SYSTEM, code: 'problem-list-item', display: 'Problem List Item' }],
          text: 'Problem List Item',
        },
      ],
      clinicalStatus: clinicalStatusConcept(clinicalStatus),
      verificationStatus: statusConcept(
        VERIFICATION_STATUS_SYSTEM,
        verificationStatus,
        verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)
      ),
      recordedDate: new Date().toISOString(),
      ...(profile ? { recorder: createReference(profile) } : {}),
      ...(onsetDate ? { onsetDateTime: onsetDate } : {}),
      ...(severity
        ? {
            severity: {
              coding: [{ system: SNOMED, code: SEVERITY_CODES[severity].code, display: SEVERITY_CODES[severity].display }],
              text: SEVERITY_CODES[severity].display,
            },
          }
        : {}),
    };

    setBusy(true);
    try {
      await medplum.createResource(condition);
      resetForm();
      await loadProblems();
    } catch (err) {
      if (isForbidden(err)) {
        setForbidden(true);
      } else {
        setError(normalizeErrorString(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(condition: Condition): Promise<void> {
    if (!condition.id) {
      return;
    }
    setError(undefined);
    setResolvingId(condition.id);
    try {
      // "add" rather than "replace": RFC6902 add overwrites an existing member
      // and still succeeds when clinicalStatus was absent.
      await medplum.patchResource('Condition', condition.id, [
        { op: 'add', path: '/clinicalStatus', value: clinicalStatusConcept('resolved') },
      ]);
      await loadProblems();
    } catch (err) {
      if (isForbidden(err)) {
        setForbidden(true);
      } else {
        setError(normalizeErrorString(err));
      }
    } finally {
      setResolvingId(undefined);
    }
  }

  if (!patient) {
    return <Loader />;
  }

  // Denied outright: show why, and hide the add form that could never save.
  if (forbidden) {
    return (
      <Page title="Problem list">
        <ForbiddenPanel what="this patient's problem list" />
      </Page>
    );
  }

  return (
    <Page title="Problem list">

      {error && (
        <Alert color={SEMANTIC.error} mb="md" title="Something went wrong">
          {error}
        </Alert>
      )}

      {problems === undefined ? (
        <Loader />
      ) : problems.length === 0 ? (
        <Text c="dimmed" mb="xl">
          No active problems recorded.
        </Text>
      ) : (
        <Table mb="xl" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Condition</Table.Th>
              <Table.Th>Clinical status</Table.Th>
              <Table.Th>Onset</Table.Th>
              <Table.Th>Recorded</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {problems.map((problem) => (
              <Table.Tr key={problem.id}>
                <Table.Td>{conceptLabel(problem.code)}</Table.Td>
                <Table.Td>{conceptLabel(problem.clinicalStatus)}</Table.Td>
                <Table.Td>{formatDate(problem.onsetDateTime)}</Table.Td>
                <Table.Td>{formatDate(problem.recordedDate)}</Table.Td>
                <Table.Td align="right">
                  <Button
                    size="xs"
                    variant="light"
                    loading={resolvingId === problem.id}
                    onClick={() => handleResolve(problem).catch(console.error)}
                  >
                    Resolve
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Divider my="lg" />

      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm" style={{ letterSpacing: '0.04em' }}>
        Add a problem
      </Text>

      {snomedAvailable === false && (
        <Alert color={SEMANTIC.info} mb="md" title="SNOMED CT not loaded on this server">
          The terminology server has no SNOMED CT expansion available, so the coded picker is
          unavailable. Conditions entered below are saved as free text (<code>Condition.code.text</code>)
          with no coding. Load a SNOMED value set to capture coded concepts.
        </Alert>
      )}

      <Stack gap="sm">
        {snomedAvailable === undefined ? (
          <Loader size="sm" />
        ) : snomedAvailable ? (
          <CodeableConceptInput
            key={codeInputNonce}
            name="code"
            label="Condition"
            binding={SNOMED_BINDING}
            path="Condition.code"
            defaultValue={code}
            onChange={setCode}
          />
        ) : (
          <TextInput
            label="Condition"
            placeholder="e.g. Type 2 diabetes mellitus"
            value={codeText}
            onChange={(e) => setCodeText(e.currentTarget.value)}
          />
        )}

        <Group grow align="flex-start">
          <TextInput
            label="Onset date"
            type="date"
            value={onsetDate}
            onChange={(e) => setOnsetDate(e.currentTarget.value)}
          />
          <Select
            label="Severity"
            placeholder="Not specified"
            clearable
            data={SEVERITY_OPTIONS}
            value={severity || null}
            onChange={(v) => setSeverity((v as Severity | null) ?? '')}
          />
        </Group>

        <Group grow align="flex-start">
          <Select
            label="Clinical status"
            data={CLINICAL_STATUS_OPTIONS}
            value={clinicalStatus}
            allowDeselect={false}
            onChange={(v) => v && setClinicalStatus(v as ClinicalStatus)}
          />
          <Select
            label="Verification status"
            data={VERIFICATION_STATUS_OPTIONS}
            value={verificationStatus}
            allowDeselect={false}
            onChange={(v) => v && setVerificationStatus(v as VerificationStatus)}
          />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={resetForm} disabled={busy}>
            Clear
          </Button>
          <Button onClick={() => handleSubmit().catch(console.error)} loading={busy}>
            Add problem
          </Button>
        </Group>
      </Stack>
    </Page>
  );
}
