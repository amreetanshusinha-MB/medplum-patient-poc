// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Container, Loader, Stack, Tabs } from '@mantine/core';
import { getReferenceString } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { useResource } from '@medplum/react';
import { IconActivityHeartbeat, IconClipboardList, IconHistory, IconListDetails, IconTimeline } from '@tabler/icons-react';
import { Fragment } from 'react';
import type { JSX } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { PatientChartHeader } from '../components/PatientChartHeader';

const TABS = [
  { value: 'overview', label: 'Overview', icon: <IconListDetails size={16} /> },
  { value: 'vitals', label: 'Vitals', icon: <IconActivityHeartbeat size={16} /> },
  { value: 'problems', label: 'Problems', icon: <IconClipboardList size={16} /> },
  { value: 'timeline', label: 'Timeline', icon: <IconTimeline size={16} /> },
  { value: 'history', label: 'History', icon: <IconHistory size={16} /> },
];

export function PatientPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  if (!patient) {
    return <Loader />;
  }

  // The index route renders Overview, so an unmatched trailing segment is
  // treated as "overview" to keep the right tab lit.
  const segment = location.pathname.split('/')[3] ?? '';
  const active = TABS.some((tab) => tab.value === segment) ? segment : 'overview';

  return (
    <Fragment key={getReferenceString(patient)}>
      <Container size={1100} maw={1100} px={0}>
        <Stack gap="md">
          <PatientChartHeader patient={patient} />

          <Tabs
            value={active}
            onChange={(value) => navigate(`/Patient/${id}/${value ?? 'overview'}`)?.catch(console.error)}
            variant="pills"
            radius="md"
            keepMounted={false}
          >
            <Tabs.List>
              {TABS.map((tab) => (
                <Tabs.Tab key={tab.value} value={tab.value} leftSection={tab.icon}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          <Outlet />
        </Stack>
      </Container>
    </Fragment>
  );
}
