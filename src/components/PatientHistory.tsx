// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Title } from '@mantine/core';
import { ResourceHistoryTable } from '@medplum/react';
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { Page } from './ui/Page';

export function PatientHistory(): JSX.Element {
  const { id } = useParams();
  return (
    <Page>
      <Title order={3} mb="xl">
        Patient History
      </Title>
      <ResourceHistoryTable resourceType="Patient" id={id} />
    </Page>
  );
}
