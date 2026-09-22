// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Alert, Button, Divider, Group, Loader, NumberInput, Stack, Text } from '@mantine/core';
import { createReference, normalizeErrorString } from '@medplum/core';
import type { Bundle, BundleEntry, Observation, Patient, Quantity } from '@medplum/fhirtypes';
import { useMedplum, useResource } from '@medplum/react';
import { useState } from 'react';
import type { JSX } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ForbiddenPanel, isForbidden } from '../components/ForbiddenPanel';
import { Page } from '../components/ui/Page';
import { SEMANTIC } from '../theme';

const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';
const CATEGORY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/observation-category';

/** Every vital in this form is keyed by one of these. */
type FieldKey = 'systolic' | 'diastolic' | 'pulse' | 'temperature' | 'height' | 'weight';

/** Mantine NumberInput hands back `number | string`; '' means "left blank". */
type FieldValue = number | string;

type FormState = Record<FieldKey, FieldValue>;

const EMPTY: FormState = {
  systolic: '',
  diastolic: '',
  pulse: '',
  temperature: '',
  height: '',
  weight: '',
};

interface FieldSpec {
  key: FieldKey;
  label: string;
  unit: string;
  unitLabel: string;
  /** Loose plausibility bounds — outside these we warn, but still submit. */
  min: number;
  max: number;
  step?: number;
  decimalScale?: number;
}

/**
 * Systolic and diastolic are components of a single blood pressure panel
 * Observation (85354-9), so they are specced separately from the standalone
 * vitals below.
 */
const BP_PANEL_CODE = '85354-9';
const BP_COMPONENTS: (FieldSpec & { code: string })[] = [
  {
    key: 'systolic',
    code: '8480-6',
    label: 'Systolic BP',
    unit: 'mm[Hg]',
    unitLabel: 'mmHg',
    min: 60,
    max: 250,
  },
  {
    key: 'diastolic',
    code: '8462-4',
    label: 'Diastolic BP',
    unit: 'mm[Hg]',
    unitLabel: 'mmHg',
    min: 30,
    max: 150,
  },
];

/** One Observation each, with a plain valueQuantity. */
const STANDALONE_VITALS: (FieldSpec & { code: string; display: string })[] = [
  {
    key: 'pulse',
    code: '8867-4',
    display: 'Heart rate',
    label: 'Pulse',
    unit: '/min',
    unitLabel: 'bpm',
    min: 30,
    max: 220,
  },
  {
    key: 'temperature',
    code: '8310-5',
    display: 'Body temperature',
    label: 'Temperature',
    unit: 'Cel',
    unitLabel: '°C',
    min: 30,
    max: 43,
    step: 0.1,
    decimalScale: 1,
  },
  {
    key: 'height',
    code: '8302-2',
    display: 'Body height',
    label: 'Height',
    unit: 'cm',
    unitLabel: 'cm',
    min: 20,
    max: 250,
    step: 0.5,
    decimalScale: 1,
  },
  {
    key: 'weight',
    code: '29463-7',
    display: 'Body weight',
    label: 'Weight',
    unit: 'kg',
    unitLabel: 'kg',
    min: 0.5,
    max: 400,
    step: 0.1,
    decimalScale: 1,
  },
];

const ALL_SPECS: FieldSpec[] = [...BP_COMPONENTS, ...STANDALONE_VITALS];

/**
 * Returns the numeric value of a field, or undefined when it was left blank or
 * holds a partial entry such as '-' or '.'.
 */
function numeric(value: FieldValue): number | undefined {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function quantity(value: number, unit: string): Quantity {
  return { value, unit, system: UCUM, code: unit };
}

export function VitalsEntry(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [error, setError] = useState<string | undefined>();
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key: FieldKey, value: FieldValue): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!patient) {
    return <Loader />;
  }

  // The server refused the write, so replace the form rather than leaving an
  // editable form that cannot possibly save.
  if (forbidden) {
    return (
      <Page title="Record vitals">
        <ForbiddenPanel what="this patient's vitals" />
      </Page>
    );
  }

  // Built here rather than inside buildObservations: the narrowing from the
  // guard above does not reach into that closure.
  const subject = createReference(patient);

  const filledKeys = ALL_SPECS.filter((spec) => numeric(form[spec.key]) !== undefined).map((s) => s.key);

  // Loose validation: flag implausible numbers without preventing submission.
  const warnings = ALL_SPECS.flatMap((spec) => {
    const value = numeric(form[spec.key]);
    if (value === undefined || (value >= spec.min && value <= spec.max)) {
      return [];
    }
    return [`${spec.label} of ${value} ${spec.unitLabel} is outside the usual range (${spec.min}–${spec.max}).`];
  });

  function buildObservations(): Observation[] {
    const profile = medplum.getProfile();
    // One timestamp for the whole batch, so the readings group as one encounter.
    const effectiveDateTime = new Date().toISOString();

    const base = {
      resourceType: 'Observation',
      status: 'final',
      category: [{ coding: [{ system: CATEGORY_SYSTEM, code: 'vital-signs', display: 'Vital Signs' }] }],
      subject,
      effectiveDateTime,
      ...(profile ? { performer: [createReference(profile)] } : {}),
    } satisfies Partial<Observation>;

    const observations: Observation[] = [];

    // Blood pressure: a single panel Observation carrying both components.
    const bpComponents = BP_COMPONENTS.flatMap((spec) => {
      const value = numeric(form[spec.key]);
      if (value === undefined) {
        return [];
      }
      return [
        {
          code: { coding: [{ system: LOINC, code: spec.code, display: spec.label }], text: spec.label },
          valueQuantity: quantity(value, spec.unit),
        },
      ];
    });

    if (bpComponents.length > 0) {
      observations.push({
        ...base,
        code: {
          coding: [{ system: LOINC, code: BP_PANEL_CODE, display: 'Blood pressure panel' }],
          text: 'Blood pressure',
        },
        component: bpComponents,
      });
    }

    for (const spec of STANDALONE_VITALS) {
      const value = numeric(form[spec.key]);
      if (value === undefined) {
        continue;
      }
      observations.push({
        ...base,
        code: { coding: [{ system: LOINC, code: spec.code, display: spec.display }], text: spec.label },
        valueQuantity: quantity(value, spec.unit),
      });
    }

    return observations;
  }

  async function handleSubmit(): Promise<void> {
    setError(undefined);

    const observations = buildObservations();
    if (observations.length === 0) {
      setError('Enter at least one vital sign before saving.');
      return;
    }

    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: observations.map(
        (resource): BundleEntry => ({
          fullUrl: `urn:uuid:${crypto.randomUUID()}`,
          resource,
          request: { method: 'POST', url: 'Observation' },
        })
      ),
    };

    setBusy(true);
    try {
      const result = await medplum.executeBatch(bundle);

      // A transaction bundle can return 200 overall while individual entries
      // carry a non-2xx status, so surface the first failure instead of
      // navigating away as though everything saved.
      const failed = result.entry?.find((e) => {
        const status = e.response?.status;
        return status && !status.startsWith('2');
      });
      if (failed) {
        setError(
          failed.response?.outcome
            ? normalizeErrorString(failed.response.outcome)
            : `Saving vitals failed with status ${failed.response?.status}.`
        );
        return;
      }

      navigate(`/Patient/${id}`)?.catch(console.error);
    } catch (err) {
      // An access policy that denies Observation refuses the write here.
      if (isForbidden(err)) {
        setForbidden(true);
      } else {
        setError(normalizeErrorString(err));
      }
    } finally {
      setBusy(false);
    }
  }

  function renderInput(spec: FieldSpec): JSX.Element {
    return (
      <NumberInput
        key={spec.key}
        label={spec.label}
        suffix={` ${spec.unitLabel}`}
        placeholder="—"
        value={form[spec.key]}
        step={spec.step}
        decimalScale={spec.decimalScale}
        onChange={(value) => set(spec.key, value)}
      />
    );
  }

  return (
    <Page title="Record vitals" description="All fields are optional — only the ones you fill in are saved.">

      {error && (
        <Alert color={SEMANTIC.error} mb="md" title="Could not save vitals">
          {error}
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert color={SEMANTIC.warning} mb="md" title="Check these values">
          <Stack gap={2}>
            {warnings.map((w) => (
              <Text key={w} size="sm">
                {w}
              </Text>
            ))}
          </Stack>
          <Text size="sm" mt="xs">
            You can still save if these readings are correct.
          </Text>
        </Alert>
      )}

      <Stack gap="sm">
        <Group grow align="flex-start">
          {BP_COMPONENTS.map(renderInput)}
        </Group>
        <Group grow align="flex-start">
          {renderInput(STANDALONE_VITALS[0])}
          {renderInput(STANDALONE_VITALS[1])}
        </Group>
        <Group grow align="flex-start">
          {renderInput(STANDALONE_VITALS[2])}
          {renderInput(STANDALONE_VITALS[3])}
        </Group>

        <Divider my="xs" />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => setForm({ ...EMPTY })} disabled={busy}>
            Clear
          </Button>
          <Button onClick={handleSubmit} loading={busy} disabled={filledKeys.length === 0}>
            Save vitals
          </Button>
        </Group>
      </Stack>
    </Page>
  );
}
