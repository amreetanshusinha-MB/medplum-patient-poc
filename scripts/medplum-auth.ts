// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Shared headless sign-in for the scripts in this directory. Credentials always
 * come from the environment — never hardcode them.
 */
import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';

export const BASE_URL = process.env.MEDPLUM_BASE_URL ?? 'http://localhost:8103/';
export const PROJECT_ID = process.env.MEDPLUM_PROJECT_ID ?? 'b4126656-a1e6-4b54-bac8-52f2eec459ff';

export function requireEnv(name: string, usage: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable ${name}.`);
    console.error(usage);
    process.exit(1);
  }
  return value;
}

/**
 * Signs in with email/password and returns a ready client.
 *
 * Expect a noisy but harmless warning during login: "Failed to hash code
 * verifier. Falling back to 'plain' code challenge method ReferenceError:
 * window is not defined". @medplum/core hashes the PKCE verifier via
 * window.btoa, which Node lacks, so it downgrades to a 'plain' challenge.
 * Shimming `window` is not the fix — @medplum/core also branches on
 * `typeof window` to decide it is running in a browser, and faking it flips
 * those paths in a Node script.
 */
export async function connect(email: string, password: string): Promise<MedplumClient> {
  const medplum = new MedplumClient({
    baseUrl: BASE_URL,
    // No localStorage outside the browser.
    storage: new ClientStorage(new MemoryStorage()),
  });

  console.log(`Signing in to ${BASE_URL} as ${email} ...`);
  const login = await medplum.startLogin({ email, password, projectId: PROJECT_ID });

  if (!login.code) {
    // A global user belonging to several projects gets a membership choice
    // instead of a code; scoping the login with projectId normally avoids this.
    const memberships = login.memberships?.map((m) => m.project?.reference ?? m.id).join(', ');
    throw new Error(
      memberships
        ? `Login did not return an authorization code. Set MEDPLUM_PROJECT_ID to one of: ${memberships}`
        : 'Login did not return an authorization code (MFA or email verification may be required).'
    );
  }

  await medplum.processCode(login.code);

  const profile = medplum.getProfile();
  console.log(`Signed in as ${profile?.resourceType}/${profile?.id}\n`);

  return medplum;
}
