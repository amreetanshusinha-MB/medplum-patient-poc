// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Read helpers for Patient resources, shared by the list, the chart header and
 * the header search.
 *
 * These only read fields that were already being read ad hoc across the UI —
 * no change to resource shapes, identifiers or FHIR calls.
 */
import { calculateAge, calculateAgeString, formatHumanName } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';

/** Must match src/pages/PatientRegistration.tsx and scripts/seed.ts. */
export const MRN_SYSTEM = 'http://patient-poc.local/mrn';

/** The MRN from the local identifier system, if present. */
export function patientMrn(patient: Patient | undefined): string | undefined {
  return patient?.identifier?.find((id) => id.system === MRN_SYSTEM)?.value;
}

/** Display name, falling back when a patient has no name recorded. */
export function patientDisplayName(patient: Patient | undefined): string {
  const name = patient?.name?.[0];
  const formatted = name ? formatHumanName(name) : '';
  return formatted.trim() || 'Unnamed patient';
}

/** Whole years, for the compact `42y` form in tables. */
export function patientAge(patient: Patient | undefined): number | undefined {
  if (!patient?.birthDate) {
    return undefined;
  }
  return calculateAge(patient.birthDate).years;
}

/**
 * Age in units appropriate to the patient — years, months or days — so an
 * infant does not read as "0y" on the chart header.
 */
export function patientAgeDisplay(patient: Patient | undefined): string | undefined {
  if (!patient?.birthDate) {
    return undefined;
  }
  return calculateAgeString(patient.birthDate);
}

/** Up to two initials for the avatar. */
export function patientInitials(patient: Patient | undefined): string {
  const name = patient?.name?.[0];
  const given = name?.given?.[0]?.trim();
  const family = name?.family?.trim();
  const initials = [given?.[0], family?.[0]].filter(Boolean).join('');
  return initials.toUpperCase() || '?';
}

/** Sentence-case gender for display. */
export function patientGender(patient: Patient | undefined): string | undefined {
  const gender = patient?.gender;
  return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : undefined;
}

/** Locale-formatted date of birth. */
export function patientDob(patient: Patient | undefined): string | undefined {
  if (!patient?.birthDate) {
    return undefined;
  }
  const parsed = new Date(patient.birthDate);
  return Number.isNaN(parsed.getTime()) ? patient.birthDate : parsed.toLocaleDateString();
}

/** `meta.lastUpdated`, formatted for the list column. */
export function patientLastUpdated(patient: Patient | undefined): string | undefined {
  const value = patient?.meta?.lastUpdated;
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}
