// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Button, Stack, Text, Title } from '@mantine/core';
import type { JSX } from 'react';
import { Link } from 'react-router';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PRODUCT_NAME } from '../theme';

export function LandingPage(): JSX.Element {
  return (
    <AuthLayout>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={3}>Welcome to {PRODUCT_NAME}</Title>
          <Text size="sm" c="dimmed">
            Patient registration and a minimal clinical record, built on Medplum. Sign in with your
            project credentials to continue.
          </Text>
        </Stack>
        <Button component={Link} to="/signin" fullWidth>
          Sign in
        </Button>
      </Stack>
    </AuthLayout>
  );
}
