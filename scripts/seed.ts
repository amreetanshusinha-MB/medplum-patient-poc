// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Seeds the local Medplum project with synthetic demo patients, vitals and
 * problem-list entries.
 *
 *   MEDPLUM_SEED_EMAIL=... MEDPLUM_SEED_PASSWORD=... npm run seed
 *
 * Safe to re-run: every seed patient has a fixed MRN, and any patient whose MRN
 * already exists is skipped rather than duplicated.
 */
import { createReference, normalizeErrorString } from '@medplum/core';
import type { Bundle, BundleEntry, Condition, Observation, Patient, Quantity } from '@medplum/fhirtypes';
import { connect, requireEnv } from './medplum-auth';

// Must match src/pages/PatientRegistration.tsx.
const MRN_SYSTEM = 'http://patient-poc.local/mrn';

// Must match src/pages/VitalsEntry.tsx.
const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';
const OBSERVATION_CATEGORY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/observation-category';
const BP_PANEL_CODE = '85354-9';
const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';

// Must match src/pages/ProblemEntry.tsx.
const CONDITION_CATEGORY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-category';
const CLINICAL_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
const VERIFICATION_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';

interface SeedCondition {
  text: string;
  status: 'active' | 'resolved';
  onsetYearsAgo: number;
}

interface SeedPatient {
  /** Fixed so re-runs detect the existing record instead of duplicating it. */
  mrn: string;
  given: string[];
  family: string;
  gender: 'male' | 'female' | 'other';
  ageYears: number;
  phone: string;
  email: string;
  line: string;
  city: string;
  state: string;
  postalCode: string;
  /** How many dated vitals sets to record (1-3). */
  vitalSets: number;
  conditions: SeedCondition[];
}

const SEED_PATIENTS: SeedPatient[] = [
  {
    mrn: 'MRN-100001',
    given: ['Aarav'],
    family: 'Naik',
    gender: 'male',
    ageYears: 0.5,
    phone: '+91 98220 11001',
    email: 'aarav.naik@example.in',
    line: 'H.No. 42, Rua de Ourem',
    city: 'Panaji',
    state: 'Goa',
    postalCode: '403001',
    vitalSets: 3,
    conditions: [],
  },
  {
    mrn: 'MRN-100002',
    given: ['Saanvi'],
    family: 'Kulkarni',
    gender: 'female',
    ageYears: 3,
    phone: '+91 98220 11002',
    email: 'saanvi.kulkarni@example.in',
    line: '12 Shivaji Nagar',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411005',
    vitalSets: 2,
    conditions: [{ text: 'Acute viral fever', status: 'resolved', onsetYearsAgo: 0.4 }],
  },
  {
    mrn: 'MRN-100003',
    given: ['Vivaan'],
    family: 'Desai',
    gender: 'male',
    ageYears: 9,
    phone: '+91 98220 11003',
    email: 'vivaan.desai@example.in',
    line: '7 Miramar Circle',
    city: 'Margao',
    state: 'Goa',
    postalCode: '403601',
    vitalSets: 1,
    conditions: [{ text: 'Bronchial asthma', status: 'active', onsetYearsAgo: 4 }],
  },
  {
    mrn: 'MRN-100004',
    given: ['Ananya'],
    family: 'Shetty',
    gender: 'female',
    ageYears: 16,
    phone: '+91 98220 11004',
    email: 'ananya.shetty@example.in',
    line: '221B Tilak Road',
    city: 'Nashik',
    state: 'Maharashtra',
    postalCode: '422002',
    vitalSets: 2,
    conditions: [],
  },
  {
    mrn: 'MRN-100005',
    given: ['Rohan'],
    family: 'Fernandes',
    gender: 'male',
    ageYears: 24,
    phone: '+91 98220 11005',
    email: 'rohan.fernandes@example.in',
    line: '5 Calangute Beach Road',
    city: 'Mapusa',
    state: 'Goa',
    postalCode: '403507',
    vitalSets: 1,
    conditions: [],
  },
  {
    mrn: 'MRN-100006',
    given: ['Priya'],
    family: 'Joshi',
    gender: 'female',
    ageYears: 31,
    phone: '+91 98220 11006',
    email: 'priya.joshi@example.in',
    line: '88 Model Colony',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411016',
    vitalSets: 3,
    conditions: [
      { text: 'Hypothyroidism', status: 'active', onsetYearsAgo: 3 },
      { text: 'Iron deficiency anaemia', status: 'resolved', onsetYearsAgo: 2 },
    ],
  },
  {
    mrn: 'MRN-100007',
    given: ['Siddharth'],
    family: 'Deshpande',
    gender: 'male',
    ageYears: 42,
    phone: '+91 98220 11007',
    email: 'siddharth.deshpande@example.in',
    line: '19 Shastri Nagar',
    city: 'Kolhapur',
    state: 'Maharashtra',
    postalCode: '416001',
    vitalSets: 2,
    conditions: [
      { text: 'Essential hypertension', status: 'active', onsetYearsAgo: 5 },
      { text: 'Gastro-oesophageal reflux disease', status: 'active', onsetYearsAgo: 1.5 },
    ],
  },
  {
    mrn: 'MRN-100008',
    given: ['Meera'],
    family: 'Pawar',
    gender: 'female',
    ageYears: 55,
    phone: '+91 98220 11008',
    email: 'meera.pawar@example.in',
    line: '3 Altinho Hill',
    city: 'Ponda',
    state: 'Goa',
    postalCode: '403401',
    vitalSets: 3,
    conditions: [
      { text: 'Type 2 diabetes mellitus', status: 'active', onsetYearsAgo: 7 },
      { text: 'Vitamin D deficiency', status: 'resolved', onsetYearsAgo: 3 },
      { text: 'Migraine', status: 'active', onsetYearsAgo: 12 },
    ],
  },
  {
    mrn: 'MRN-100009',
    given: ['Anil'],
    family: 'Gaonkar',
    gender: 'male',
    ageYears: 68,
    phone: '+91 98220 11009',
    email: 'anil.gaonkar@example.in',
    line: '27 Vasco Market Road',
    city: 'Vasco da Gama',
    state: 'Goa',
    postalCode: '403802',
    vitalSets: 2,
    conditions: [
      { text: 'Osteoarthritis of knee', status: 'active', onsetYearsAgo: 6 },
      { text: 'Essential hypertension', status: 'active', onsetYearsAgo: 9 },
    ],
  },
  {
    mrn: 'MRN-100010',
    given: ['Lakshmi'],
    family: 'Patil',
    gender: 'female',
    ageYears: 81,
    phone: '+91 98220 11010',
    email: 'lakshmi.patil@example.in',
    line: '64 Dadar East',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400014',
    vitalSets: 3,
    conditions: [
      { text: 'Chronic lower back pain', status: 'active', onsetYearsAgo: 10 },
      { text: 'Type 2 diabetes mellitus', status: 'active', onsetYearsAgo: 15 },
    ],
  },
];

/** Deterministic PRNG so repeated runs produce the same plausible numbers. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Range = [number, number];

function pick(rng: () => number, [min, max]: Range, decimals = 0): number {
  const value = min + rng() * (max - min);
  return Number(value.toFixed(decimals));
}

interface VitalBand {
  pulse: Range;
  tempC: Range;
  heightCm: Range;
  weightKg: Range;
  systolic: Range;
  diastolic: Range;
}

/**
 * Age-appropriate reference ranges. An infant's pulse and BP are nothing like
 * an adult's, so the bands shift with age rather than using one adult range.
 */
function bandForAge(ageYears: number): VitalBand {
  if (ageYears < 1) {
    return {
      pulse: [100, 160],
      tempC: [36.5, 37.5],
      heightCm: [58, 76],
      weightKg: [5.5, 10],
      systolic: [72, 100],
      diastolic: [45, 65],
    };
  }
  if (ageYears < 6) {
    return {
      pulse: [90, 140],
      tempC: [36.4, 37.4],
      heightCm: [82, 112],
      weightKg: [11, 20],
      systolic: [88, 106],
      diastolic: [52, 70],
    };
  }
  if (ageYears < 13) {
    return {
      pulse: [70, 118],
      tempC: [36.3, 37.3],
      heightCm: [115, 152],
      weightKg: [20, 46],
      systolic: [95, 112],
      diastolic: [58, 76],
    };
  }
  if (ageYears < 19) {
    return {
      pulse: [58, 100],
      tempC: [36.2, 37.2],
      heightCm: [150, 178],
      weightKg: [45, 72],
      systolic: [104, 122],
      diastolic: [64, 80],
    };
  }
  if (ageYears < 65) {
    return {
      pulse: [58, 96],
      tempC: [36.2, 37.2],
      heightCm: [150, 186],
      weightKg: [50, 95],
      systolic: [108, 136],
      diastolic: [68, 88],
    };
  }
  return {
    pulse: [55, 92],
    tempC: [36.0, 37.1],
    heightCm: [148, 176],
    weightKg: [48, 86],
    systolic: [118, 152],
    diastolic: [68, 90],
  };
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function birthDateFromAge(ageYears: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - Math.floor(ageYears));
  date.setDate(date.getDate() - Math.round((ageYears % 1) * 365));
  return date.toISOString().slice(0, 10);
}

function quantity(value: number, unit: string): Quantity {
  return { value, unit, system: UCUM, code: unit };
}

function buildPatient(seed: SeedPatient): Patient {
  return {
    resourceType: 'Patient',
    active: true,
    identifier: [{ system: MRN_SYSTEM, value: seed.mrn }],
    name: [{ given: seed.given, family: seed.family }],
    birthDate: birthDateFromAge(seed.ageYears),
    gender: seed.gender,
    telecom: [
      { system: 'phone', value: seed.phone, use: 'mobile' },
      { system: 'email', value: seed.email },
    ],
    address: [
      {
        line: [seed.line],
        city: seed.city,
        state: seed.state,
        postalCode: seed.postalCode,
        country: 'IN',
      },
    ],
  };
}

/** Days before today at which each vitals set is recorded. */
const VITALS_OFFSETS = [180, 45, 4];

function buildVitals(seed: SeedPatient, patient: Patient, performer: Observation['performer']): Observation[] {
  const band = bandForAge(seed.ageYears);
  const subject = createReference(patient);
  const observations: Observation[] = [];

  // Seeded by MRN digits so each patient's numbers are stable across runs.
  const rng = mulberry32(Number(seed.mrn.slice(-6)));

  for (let i = 0; i < seed.vitalSets; i++) {
    const effectiveDateTime = daysAgo(VITALS_OFFSETS[i]).toISOString();
    const base = {
      resourceType: 'Observation',
      status: 'final',
      category: [
        { coding: [{ system: OBSERVATION_CATEGORY_SYSTEM, code: 'vital-signs', display: 'Vital Signs' }] },
      ],
      subject,
      effectiveDateTime,
      ...(performer ? { performer } : {}),
    } satisfies Partial<Observation>;

    observations.push({
      ...base,
      code: {
        coding: [{ system: LOINC, code: BP_PANEL_CODE, display: 'Blood pressure panel' }],
        text: 'Blood pressure',
      },
      component: [
        {
          code: { coding: [{ system: LOINC, code: SYSTOLIC_CODE, display: 'Systolic BP' }], text: 'Systolic BP' },
          valueQuantity: quantity(pick(rng, band.systolic), 'mm[Hg]'),
        },
        {
          code: { coding: [{ system: LOINC, code: DIASTOLIC_CODE, display: 'Diastolic BP' }], text: 'Diastolic BP' },
          valueQuantity: quantity(pick(rng, band.diastolic), 'mm[Hg]'),
        },
      ],
    });

    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: '8867-4', display: 'Heart rate' }], text: 'Pulse' },
      valueQuantity: quantity(pick(rng, band.pulse), '/min'),
    });

    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: '8310-5', display: 'Body temperature' }], text: 'Temperature' },
      valueQuantity: quantity(pick(rng, band.tempC, 1), 'Cel'),
    });

    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: '8302-2', display: 'Body height' }], text: 'Height' },
      valueQuantity: quantity(pick(rng, band.heightCm, 1), 'cm'),
    });

    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: '29463-7', display: 'Body weight' }], text: 'Weight' },
      valueQuantity: quantity(pick(rng, band.weightKg, 1), 'kg'),
    });
  }

  return observations;
}

function buildConditions(seed: SeedPatient, patient: Patient, recorder: Condition['recorder']): Condition[] {
  const subject = createReference(patient);

  return seed.conditions.map((entry) => {
    const onset = daysAgo(Math.round(entry.onsetYearsAgo * 365));
    const display = entry.status === 'active' ? 'Active' : 'Resolved';

    return {
      resourceType: 'Condition',
      subject,
      // The local server has no SNOMED value set loaded, so problems are
      // recorded as free text only — the same fallback the UI uses.
      code: { text: entry.text },
      category: [
        {
          coding: [
            { system: CONDITION_CATEGORY_SYSTEM, code: 'problem-list-item', display: 'Problem List Item' },
          ],
          text: 'Problem List Item',
        },
      ],
      clinicalStatus: {
        coding: [{ system: CLINICAL_STATUS_SYSTEM, code: entry.status, display }],
        text: display,
      },
      verificationStatus: {
        coding: [{ system: VERIFICATION_STATUS_SYSTEM, code: 'confirmed', display: 'Confirmed' }],
        text: 'Confirmed',
      },
      onsetDateTime: onset.toISOString(),
      recordedDate: new Date().toISOString(),
      ...(recorder ? { recorder } : {}),
      // A resolved problem needs an abatement date to read as real history.
      ...(entry.status === 'resolved'
        ? { abatementDateTime: daysAgo(Math.round(entry.onsetYearsAgo * 365) - 30).toISOString() }
        : {}),
    } satisfies Condition;
  });
}

const USAGE = 'Usage: MEDPLUM_SEED_EMAIL=... MEDPLUM_SEED_PASSWORD=... npm run seed';

async function main(): Promise<void> {
  const email = requireEnv('MEDPLUM_SEED_EMAIL', USAGE);
  const password = requireEnv('MEDPLUM_SEED_PASSWORD', USAGE);

  const medplum = await connect(email, password);
  const profile = medplum.getProfile();

  const performer = profile ? [createReference(profile)] : undefined;
  const recorder = profile ? createReference(profile) : undefined;

  let created = 0;
  let skipped = 0;
  let observationCount = 0;
  let conditionCount = 0;
  const failures: string[] = [];

  for (const seed of SEED_PATIENTS) {
    const label = `${seed.given.join(' ')} ${seed.family} (${seed.mrn})`;
    try {
      const existing = await medplum.searchOne('Patient', {
        identifier: `${MRN_SYSTEM}|${seed.mrn}`,
      });
      if (existing) {
        console.log(`  skip    ${label} — already exists`);
        skipped++;
        continue;
      }

      const patient = await medplum.createResource(buildPatient(seed));

      const observations = buildVitals(seed, patient, performer);
      const conditions = buildConditions(seed, patient, recorder);
      const resources: (Observation | Condition)[] = [...observations, ...conditions];

      if (resources.length > 0) {
        const bundle: Bundle = {
          resourceType: 'Bundle',
          type: 'transaction',
          entry: resources.map(
            (resource): BundleEntry => ({
              fullUrl: `urn:uuid:${crypto.randomUUID()}`,
              resource,
              request: { method: 'POST', url: resource.resourceType },
            })
          ),
        };

        const result = await medplum.executeBatch(bundle);
        const failed = result.entry?.find((e) => {
          const status = e.response?.status;
          return status && !status.startsWith('2');
        });
        if (failed) {
          throw new Error(`batch entry failed with status ${failed.response?.status}`);
        }
      }

      created++;
      observationCount += observations.length;
      conditionCount += conditions.length;
      console.log(
        `  create  ${label} — ${seed.vitalSets} vitals set(s) (${observations.length} observations), ` +
          `${conditions.length} condition(s)`
      );
    } catch (err) {
      const message = normalizeErrorString(err);
      failures.push(`${label}: ${message}`);
      console.error(`  FAIL    ${label} — ${message}`);
    }
  }

  console.log('\nSummary');
  console.log(`  Patients created:   ${created}`);
  console.log(`  Patients skipped:   ${skipped} (MRN already present)`);
  console.log(`  Observations:       ${observationCount}`);
  console.log(`  Conditions:         ${conditionCount}`);

  if (failures.length > 0) {
    console.log(`  Failures:           ${failures.length}`);
    for (const failure of failures) {
      console.log(`    - ${failure}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nSeed failed: ${normalizeErrorString(err)}`);
  process.exit(1);
});
