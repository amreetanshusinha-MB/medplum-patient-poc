import { ActionIcon, Alert, Button, Divider, Group, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';
import { Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { Page } from '../components/ui/Page';
import { SEMANTIC } from '../theme';

const MRN_SYSTEM = 'http://patient-poc.local/mrn';

interface FormState {
  mrn: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string;
  line: string;
  city: string;
  state: string;
  postalCode: string;
}

const EMPTY: FormState = {
  mrn: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  phone: '',
  email: '',
  line: '',
  city: '',
  state: '',
  postalCode: '',
};

function generateMrn(): string {
  return 'MRN-' + Math.floor(100000 + Math.random() * 900000);
}

export function PatientRegistration(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ ...EMPTY, mrn: generateMrn() });
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function set(field: keyof FormState, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildPatient(): Patient {
    const patient: Patient = {
      resourceType: 'Patient',
      active: true,
      identifier: [{ system: MRN_SYSTEM, value: form.mrn.trim() }],
      name: [{ given: [form.firstName.trim()], family: form.lastName.trim() }],
    };

    if (form.birthDate) {
      patient.birthDate = form.birthDate;
    }
    if (form.gender) {
      patient.gender = form.gender as Patient['gender'];
    }

    const telecom = [];
    if (form.phone.trim()) {
      telecom.push({ system: 'phone' as const, value: form.phone.trim(), use: 'mobile' as const });
    }
    if (form.email.trim()) {
      telecom.push({ system: 'email' as const, value: form.email.trim() });
    }
    if (telecom.length > 0) {
      patient.telecom = telecom;
    }

    if (form.line.trim() || form.city.trim() || form.postalCode.trim()) {
      patient.address = [
        {
          line: form.line.trim() ? [form.line.trim()] : undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          postalCode: form.postalCode.trim() || undefined,
          country: 'IN',
        },
      ];
    }

    return patient;
  }

  async function handleSubmit(): Promise<void> {
    setError(undefined);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!form.mrn.trim()) {
      setError('MRN is required.');
      return;
    }

    setBusy(true);
    try {
      const existing = await medplum.searchOne('Patient', {
        identifier: `${MRN_SYSTEM}|${form.mrn.trim()}`,
      });
      if (existing) {
        setError(`A patient with MRN ${form.mrn} already exists.`);
        return;
      }

      const created = await medplum.createResource(buildPatient());
      navigate(`/Patient/${created.id}`);
    } catch (err) {
      setError(normalizeErrorString(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Register new patient" description="Demographics are stored as a FHIR Patient resource." maw={760}>
      {error && (
        <Alert color={SEMANTIC.error} mb="md">
          {error}
        </Alert>
      )}

      <Stack gap="lg">
        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
            Identifier
          </Text>
          <TextInput
            label="MRN"
            required
            description="Generated locally. Checked for duplicates before the record is created."
            value={form.mrn}
            onChange={(e) => set('mrn', e.currentTarget.value)}
            maw={320}
            rightSection={
              <Tooltip label="Generate a new MRN">
                <ActionIcon variant="subtle" color="gray" onClick={() => set('mrn', generateMrn())} aria-label="Regenerate MRN">
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            }
          />
        </Stack>

        <Divider />

        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
          Patient details
        </Text>

        <Group grow align="flex-start">
          <TextInput
            label="First name"
            required
            value={form.firstName}
            onChange={(e) => set('firstName', e.currentTarget.value)}
          />
          <TextInput
            label="Last name"
            required
            value={form.lastName}
            onChange={(e) => set('lastName', e.currentTarget.value)}
          />
        </Group>

        <Group grow align="flex-start">
          <TextInput
            label="Date of birth"
            type="date"
            value={form.birthDate}
            onChange={(e) => set('birthDate', e.currentTarget.value)}
          />
          <Select
            label="Gender"
            data={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'unknown', label: 'Unknown' },
            ]}
            value={form.gender || null}
            onChange={(v) => set('gender', v ?? '')}
          />
        </Group>

        <Divider />

        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
          Contact
        </Text>

        <Group grow align="flex-start">
          <TextInput
            label="Phone"
            value={form.phone}
            onChange={(e) => set('phone', e.currentTarget.value)}
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.currentTarget.value)}
          />
        </Group>

        <TextInput
          label="Address line"
          value={form.line}
          onChange={(e) => set('line', e.currentTarget.value)}
        />

        <Group grow align="flex-start">
          <TextInput label="City" value={form.city} onChange={(e) => set('city', e.currentTarget.value)} />
          <TextInput label="State" value={form.state} onChange={(e) => set('state', e.currentTarget.value)} />
          <TextInput
            label="Postal code"
            value={form.postalCode}
            onChange={(e) => set('postalCode', e.currentTarget.value)}
          />
        </Group>

        <Divider />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => setForm({ ...EMPTY, mrn: generateMrn() })}>
            Reset
          </Button>
          <Button onClick={handleSubmit} loading={busy}>
            Register patient
          </Button>
        </Group>
      </Stack>
    </Page>
  );
}