// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Creates the "Front desk" AccessPolicy and attaches it to a restricted user's
 * ProjectMembership, demonstrating server-side access control.
 *
 *   MEDPLUM_SEED_EMAIL=...        # project admin, used to sign in
 *   MEDPLUM_SEED_PASSWORD=...
 *   MEDPLUM_RESTRICTED_EMAIL=...  # the front-desk user to restrict
 *   MEDPLUM_RESTRICTED_PASSWORD=... # optional; sets/resets their password
 *   npm run access-policy
 *
 * Safe to re-run: the policy is matched by name and updated in place, and the
 * membership is upserted rather than duplicated.
 *
 * Why this script creates the user rather than the /register flow: registering
 * into an EXISTING project requires a recaptcha token (this server answers
 * "Recaptcha token is required" for any /auth/newuser call carrying a
 * projectId), and the invite email never arrives because SMTP is unconfigured.
 * `invite` with an explicit password and sendEmail:false sidesteps both.
 */
import { createReference, normalizeErrorString } from '@medplum/core';
import type { AccessPolicy, AccessPolicyResource, ProjectMembership } from '@medplum/fhirtypes';
import { PROJECT_ID, connect, requireEnv } from './medplum-auth';

const POLICY_NAME = 'Front desk';

const USAGE = [
  'Usage:',
  '  MEDPLUM_SEED_EMAIL=... MEDPLUM_SEED_PASSWORD=... \\',
  '  MEDPLUM_RESTRICTED_EMAIL=... [MEDPLUM_RESTRICTED_PASSWORD=...] \\',
  '  npm run access-policy',
].join('\n');

/**
 * Medplum AccessPolicy is an allow-list: a resource type that is not listed is
 * denied outright. So Observation and Condition are granted no access simply by
 * being absent below — there is no "deny" entry to write.
 */
const FRONT_DESK_RESOURCES: AccessPolicyResource[] = [
  {
    // Registration staff create and update patients, but may not delete them.
    resourceType: 'Patient',
    interaction: ['read', 'vread', 'history', 'search', 'create', 'update'],
  },
  {
    // Read-only: the front desk can look clinicians up but not edit them.
    resourceType: 'Practitioner',
    interaction: ['read', 'vread', 'history', 'search'],
  },
];

async function main(): Promise<void> {
  const email = requireEnv('MEDPLUM_SEED_EMAIL', USAGE);
  const password = requireEnv('MEDPLUM_SEED_PASSWORD', USAGE);
  const restrictedEmail = requireEnv('MEDPLUM_RESTRICTED_EMAIL', USAGE);
  const restrictedPassword = process.env.MEDPLUM_RESTRICTED_PASSWORD;

  const medplum = await connect(email, password);

  const projectId = medplum.getProject()?.id ?? PROJECT_ID;

  // AccessPolicy is small in a POC project, so list and match by name rather
  // than depending on a `name` search parameter being indexed.
  const existingPolicies = await medplum.searchResources('AccessPolicy', {});
  const existing = existingPolicies.find((p) => p.name === POLICY_NAME);

  const desired: AccessPolicy = {
    resourceType: 'AccessPolicy',
    name: POLICY_NAME,
    resource: FRONT_DESK_RESOURCES,
    ...(existing?.id ? { id: existing.id } : {}),
  };

  const policy = existing
    ? await medplum.updateResource<AccessPolicy>(desired)
    : await medplum.createResource<AccessPolicy>(desired);

  console.log(`${existing ? 'Updated' : 'Created'} AccessPolicy/${policy.id} "${POLICY_NAME}"`);
  for (const entry of FRONT_DESK_RESOURCES) {
    console.log(`  allow  ${entry.resourceType.padEnd(14)} ${entry.interaction?.join(', ')}`);
  }
  console.log(`  deny   ${'Observation'.padEnd(14)} (not listed in the policy)`);
  console.log(`  deny   ${'Condition'.padEnd(14)} (not listed in the policy)\n`);

  // upsert:true creates the user and membership on first run and updates the
  // membership on later runs, so the access policy attaches idempotently.
  // sendEmail:false because SMTP is unconfigured on this server.
  const result = await medplum.invite(projectId, {
    resourceType: 'Practitioner',
    firstName: 'Front',
    lastName: 'Desk',
    email: restrictedEmail,
    sendEmail: false,
    upsert: true,
    ...(restrictedPassword ? { password: restrictedPassword } : {}),
    membership: {
      accessPolicy: createReference(policy),
    },
  });

  if (result.resourceType === 'OperationOutcome') {
    throw new Error(normalizeErrorString(result));
  }

  const membership = result as ProjectMembership;
  console.log(`Attached policy to ProjectMembership/${membership.id}`);
  console.log(`  user     ${membership.user?.reference ?? restrictedEmail}`);
  console.log(`  profile  ${membership.profile?.reference ?? '(none)'}`);
  console.log(`  policy   ${membership.accessPolicy?.reference ?? '(none)'}`);

  if (!restrictedPassword) {
    console.log(
      '\nNote: MEDPLUM_RESTRICTED_PASSWORD was not set, so no password was assigned.\n' +
        'If this user is new they cannot sign in yet — re-run with that variable set.'
    );
  }

  console.log('\nVerify by signing in as the restricted user: the Overview vitals and');
  console.log('problems panels, and the Vitals and Problems tabs, should all report');
  console.log("\"You don't have permission to view this\" while patient search still works.");
}

main().catch((err) => {
  console.error(`\nAccess policy setup failed: ${normalizeErrorString(err)}`);
  process.exit(1);
});
