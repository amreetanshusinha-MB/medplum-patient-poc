// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Title } from '@mantine/core';
import { ResourceTable } from '@medplum/react';
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { ClinicalSummary } from './ClinicalSummary';
import { Page } from './ui/Page';

/*
 * You can combine Medplum components with plain HTML to quickly display patient data.
 * Medplum has out of the box components to render common data types such as
 *   - Addresses
 *   - Phone numbers
 *   - Patient/Provider names
 *   - Patient/Provider profile photo
 * */
export function PatientOverview(): JSX.Element {
  const { id } = useParams();
  return (
    <Page>
      <Title order={3} mb="xl">
        Patient Overview
      </Title>
      <ClinicalSummary />
      <ResourceTable value={{ reference: `Patient/${id}` }} />
    </Page>
  );
}
