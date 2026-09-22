// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text, Title } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PRODUCT_NAME } from '../theme';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      {/*
       * Medplum's SignInForm is kept as-is — it owns the auth flow, including
       * PKCE, MFA and Google sign-in. Only the surrounding chrome is ours.
       */}
      <SignInForm
        googleClientId={import.meta.env.GOOGLE_CLIENT_ID}
        onSuccess={() => navigate('/')?.catch(console.error)}
        clientId={import.meta.env.MEDPLUM_CLIENT_ID}
      >
        <Stack gap={4} mb="xs">
          <Title order={3}>Sign in to {PRODUCT_NAME}</Title>
          <Text size="sm" c="dimmed">
            Use your project credentials.
          </Text>
        </Stack>
      </SignInForm>
    </AuthLayout>
  );
}
