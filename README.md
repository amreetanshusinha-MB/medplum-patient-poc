# Patient POC — Medplum Registration & Basic Clinical Record

A demo-quality proof of concept showing patient registration and a minimal
clinical record built on [Medplum](https://www.medplum.com/), a FHIR-native EHR
platform. Clinician-facing only — there is no patient portal.

## What this demonstrates

- **FHIR-native storage.** Every piece of clinical data is a standards-compliant
  FHIR R4 resource. Nothing is stored in a bespoke schema.
- **Patient registration** with an MRN identifier and a duplicate check before
  create.
- **Vitals capture** written as proper `Observation` resources, including the
  blood-pressure panel with systolic and diastolic as *components* of one
  resource rather than two unrelated readings.
- **A problem list** as `Condition` resources with coded clinical and
  verification status.
- **One GraphQL query** populating the whole chart summary, instead of several
  REST round trips.
- **Server-side access control.** An `AccessPolicy` restricts a front-desk role
  to patient demographics, and the UI renders that denial as a distinct
  "Restricted" state rather than an error or an empty panel. This is enforced by
  the server, not hidden in the client.

Built on the `medplum/medplum-hello-world` starter (git history removed).

## Prerequisites

| Tool | Version used | Notes |
| --- | --- | --- |
| Docker + Compose | 29.x | Runs the Medplum server, Postgres and Redis |
| Node.js | 24.13 | `^22.18.0 \|\| >=24.2.0` per `package.json` |
| npm | 11.x | |

On an AD-joined Linux machine Docker may require `sudo` for every command. That
was the case on the development machine here.

## Setup from a clean machine

### 1. Start the Medplum stack

Medplum publishes a Compose file that brings up the server, Postgres and Redis
together — see [Medplum self-hosting](https://www.medplum.com/docs/self-hosting)
for the current file and options. On the development machine here it lives
outside this repo, alongside the workshop bundle it came from. From that
directory:

```bash
docker compose up -d      # add sudo if your user is not in the docker group
```

Confirm the server is healthy before going further:

```bash
curl http://localhost:8103/healthcheck
# {"ok":true,"version":"5.1.30-...","postgres":true,"redis":true,...}
```

Ports in play: **8103** the FHIR server, **3000** the Medplum admin app, 5432
Postgres, 6379 Redis.

### 2. Register a project

Open the admin app at <http://localhost:3000> and use the register flow to
create a user and a project. Keep the project id and your login — the seed
scripts need both.

> The register flow creates a **new** project. It cannot join an existing one on
> this server; see [Known gaps](#known-gaps).

### 3. Create a ClientApplication (optional)

In the admin app, under your project, create a ClientApplication and note its
id. This is optional: `src/main.tsx` constructs `MedplumClient` with only
`baseUrl`, so the app never sends a client id. Passing one caused login failures
for a global (non-project-scoped) user during development, which is why
`MEDPLUM_CLIENT_ID` stays empty in `.env`.

### 4. Configure `.env`

```bash
cp .env.defaults .env
```

**Then edit it.** `.env.defaults` points at Medplum's hosted cloud, so leaving
it untouched will silently talk to the wrong server:

```diff
-MEDPLUM_BASE_URL=https://api.medplum.com/
+MEDPLUM_BASE_URL=http://localhost:8103/
```

Note `vite.config.ts` copies `.env.defaults` to `.env` automatically if `.env`
is missing, so the file may appear without you creating it — with the cloud URL
in place. Check it.

Vite only reads `.env` at startup. Restart the dev server after any change.
`.env` is gitignored; do not commit it.

### 5. Install and run

```bash
npm install
npm run dev
```

The app serves on <http://localhost:5173>. Keep it on 5173 — 3000 is the admin
app.

## Seeding demo data

Creates 10 patients with plausible Indian names, ages from infant to elderly,
Goa/Maharashtra addresses, 1–3 dated vitals sets each with age-appropriate
values, and problem-list entries for about half of them.

```bash
MEDPLUM_SEED_EMAIL=you@example.com \
MEDPLUM_SEED_PASSWORD='your-password' \
npm run seed
```

Safe to re-run: each seed patient has a fixed MRN (`MRN-100001`…`MRN-100010`)
and any patient whose MRN already exists is skipped rather than duplicated.

Optional overrides: `MEDPLUM_BASE_URL`, `MEDPLUM_PROJECT_ID`.

## Creating the restricted user

Creates the "Front desk" `AccessPolicy` and attaches it to a user's
`ProjectMembership`, creating that user if needed:

```bash
MEDPLUM_SEED_EMAIL=you@example.com \
MEDPLUM_SEED_PASSWORD='your-password' \
MEDPLUM_RESTRICTED_EMAIL=frontdesk@yopmail.com \
MEDPLUM_RESTRICTED_PASSWORD='at-least-8-chars' \
npm run access-policy
```

Sign in as that user to see the access control take effect. Omitting
`MEDPLUM_RESTRICTED_PASSWORD` creates the membership but leaves the user unable
to sign in; the script warns when that happens.

The script uses the admin `invite` API with `password` set and
`sendEmail: false`, which is the only procedure that works on this server — see
[Known gaps](#known-gaps).

## FHIR resources used, and why

### `Patient`
The demographic record and the anchor every other resource references. Carries
an MRN in `identifier` under the local system `http://patient-poc.local/mrn`,
plus name, birth date, gender, `telecom` and `address`. Registration checks for
an existing MRN with `searchOne` before creating, so the same patient is not
entered twice.

### `Observation` (vitals)
One resource per reading, `status: 'final'`, categorised `vital-signs`, with
`subject` pointing at the patient, `performer` at the signed-in clinician, and a
`valueQuantity` carrying UCUM units.

| Vital | LOINC | UCUM |
| --- | --- | --- |
| Blood pressure panel | 85354-9 | — |
| ↳ Systolic | 8480-6 | `mm[Hg]` |
| ↳ Diastolic | 8462-4 | `mm[Hg]` |
| Pulse | 8867-4 | `/min` |
| Temperature | 8310-5 | `Cel` |
| Height | 8302-2 | `cm` |
| Weight | 29463-7 | `kg` |

**Blood pressure is deliberately one Observation, not two.** The panel
(85354-9) holds systolic and diastolic as entries in `component`, each with its
own code and `valueQuantity`. This is what FHIR specifies, and it matters: a
systolic reading is meaningless detached from the diastolic taken at the same
moment. Storing them as two sibling resources loses that pairing and lets them
drift apart in queries. The chart summary reads the components back out to
render `120/80 mmHg`.

All observations for one submission share a single `effectiveDateTime` and are
written in one FHIR transaction `Bundle`, so a set of vitals lands atomically
rather than as a partial row of readings.

### `Condition` (problem list)
Categorised `problem-list-item`, with `clinicalStatus` and `verificationStatus`
as `CodeableConcept`s on the standard HL7 systems
(`condition-clinical`, `condition-ver-status`) rather than bare strings, so the
status is machine-comparable. `recorder` attributes the entry, `onsetDateTime`
and `abatementDateTime` bound it in time. Resolving a problem is a JSON Patch
that rewrites `clinicalStatus`, preserving history rather than deleting the row.

### `AccessPolicy`
Server-enforced, role-based restriction attached to a `ProjectMembership`. The
"Front desk" policy grants:

| Resource | Interactions |
| --- | --- |
| `Patient` | read, vread, history, search, create, update |
| `Practitioner` | read, vread, history, search |
| `Observation` | none |
| `Condition` | none |

Medplum's `AccessPolicy` is an **allow-list**: a resource type absent from
`AccessPolicy.resource` is denied. There is no "deny" entry to write, which is
why Observation and Condition simply do not appear. Note that
`AccessPolicyResource.readonly` is deprecated in favour of `interaction`.

## Known gaps

Stated plainly, so nothing here is mistaken for production behaviour.

- **No SNOMED CT loaded.** The local terminology server has no SNOMED expansion,
  so the problem-list picker falls back to a plain text input and conditions are
  saved as `Condition.code.text` with **no coding at all**. Free-text problems
  cannot be queried, aggregated or exchanged meaningfully. The UI detects this at
  runtime with `useValueSetAvailability` and shows a note explaining the
  fallback; load a SNOMED value set and the coded picker returns with no code
  change.
- **SMTP is not configured.** No email is ever sent, so invite and
  password-reset links never arrive. Inviting a user therefore requires passing
  `password` explicitly with `sendEmail: false`. The documented fallback of
  "create the membership, then let the user set a password" does not work — an
  invited user has no password and so cannot authenticate to reach the
  change-password page.
- **Self-registration cannot join an existing project.** `POST /auth/newuser`
  with a `projectId` is rejected with `Recaptcha token is required`; that path is
  Medplum's patient self-signup and is gated behind a recaptcha site key this
  project does not have. Registering without a `projectId` creates a new project
  instead.
- **MRNs are randomly generated, not issued by an MPI.** The registration form
  produces `MRN-` plus six random digits, and the duplicate check only catches an
  exact MRN collision. There is no master patient index, no demographic
  matching, and nothing preventing the same human being registered twice under
  two different MRNs. The seed script uses fixed MRNs precisely because random
  ones would never collide and every run would duplicate the cohort.
- **No `Encounter` model.** Observations and Conditions hang directly off the
  patient with no visit context, so there is no way to ask "what happened at
  the appointment on Tuesday". Vitals recorded together are correlated only by a
  shared `effectiveDateTime`.
- **Also out of scope:** `AllergyIntolerance`, `MedicationRequest`,
  `Questionnaire`, Bots, and any patient-facing portal.
- **The chart summary does not live-refresh.** It fetches once on mount, so
  recording a vital and returning to Overview needs a reload. No subscription is
  wired up.
- **`npm run lint` is broken.** ESLint 9 is installed but there is no
  `eslint.config.js` — the starter's config never migrated to flat config.
- **Signing in from Node logs a PKCE warning.** `@medplum/core` hashes the PKCE
  verifier with `window.btoa`, which Node lacks, so the scripts fall back to a
  `plain` code challenge. Harmless here; do not "fix" it by shimming `window`,
  because `@medplum/core` also branches on `typeof window` to decide it is
  running in a browser.

## Production readiness

What this POC deliberately skips. None of the following is a nice-to-have; each
is a precondition for putting real patient data in this system.

### Hosting, resilience and backups
Everything runs in local Docker with Postgres state in a container volume. There
is no backup, no tested restore, no point-in-time recovery, no replication and
no disaster-recovery plan. A real deployment needs managed or properly operated
Postgres with automated backups, **verified restores**, defined RPO/RTO targets,
TLS termination, secret management outside `.env` files, and monitoring with
alerting. Medplum offers a hosted option that covers much of this.

### Consent and data retention
There is no consent model at all — no `Consent` resources, no record of what a
patient agreed to, no enforcement of purpose-of-use, and no data-retention or
deletion policy. Real deployments need documented lawful basis for processing,
consent capture and withdrawal, retention schedules per data class, and a
defensible deletion path. In India specifically, the DPDP Act 2023 obligations
around notice, consent and data-principal rights would apply, alongside ABDM
requirements if the system ever exchanged data with the national health stack.

### Audit logging and review
Medplum writes `AuditEvent` resources, but nothing in this POC reviews them.
Production needs those events shipped to tamper-evident storage, retained to
policy, and **actually monitored** — break-glass alerting, periodic access
review, and a named owner for investigating anomalous access. An audit log
nobody reads is not a control.

### Terminology
No SNOMED CT, and LOINC codes are hardcoded in the application source rather
than validated against a loaded code system. Production needs licensed
terminology loaded into the server (SNOMED CT requires an affiliate licence;
national editions differ), value sets bound to the elements that need them,
server-side validation of submitted codes, and a plan for periodic terminology
updates and re-coding.

### Authentication and MFA
Email-and-password only, with no MFA, no SSO, no session or password policy, and
no account-lockout tuning. Clinical systems need MFA enforced for all users,
SSO against the organisation's directory, scoped service accounts for
integrations rather than shared human logins, and short session lifetimes with
re-authentication for sensitive actions.

### Regulatory posture (HIPAA / ONC)
This POC has no compliance posture whatsoever. For US deployment handling PHI
under HIPAA: a signed BAA with every vendor touching PHI, a completed Security
Risk Analysis, documented administrative/physical/technical safeguards,
workforce training, breach-notification procedures, and encryption at rest and
in transit. For ONC certification, the relevant criteria bring further
requirements — USCDI data-element support, standardised API access via FHIR
(with SMART on FHIR authorisation), information-blocking obligations, and
patient access provisions. The access-control demo here is a starting point, not
evidence of compliance.

### Also required before production
Automated tests (there are none — the starter's Vitest setup was removed), CI
running type-check, lint and tests on every change, error tracking, structured
application logging, accessibility review, load testing, and a documented
runbook for on-call.

## Project layout

```
src/
  App.tsx                     AppShell, menu and routes
  main.tsx                    MedplumClient + providers
  components/
    ClinicalSummary.tsx       Overview panels, one GraphQL query
    ForbiddenPanel.tsx        403 handling, isForbidden()
    PatientOverview.tsx       Overview tab
    PatientHistory.tsx        History tab
    Timeline.tsx              Timeline tab
  pages/
    PatientRegistration.tsx   Registration form, MRN duplicate check
    VitalsEntry.tsx           Vitals form, transaction Bundle
    ProblemEntry.tsx          Problem list + add form
    PatientPage.tsx           Patient chart tabs
    HomePage.tsx              Patient search
    ...
scripts/
  medplum-auth.ts             Shared headless sign-in
  seed.ts                     Synthetic demo data
  access-policy.ts            AccessPolicy + restricted user
```

`POC_CONTEXT.md` holds the working notes, environment details and decisions
taken during development. `DEMO.md` is the walkthrough script.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on 5173 |
| `npm run build` | Type-check and production build |
| `npm run seed` | Populate synthetic demo data |
| `npm run access-policy` | Create the AccessPolicy and restricted user |
| `npm run preview` | Serve the production build |
| `npm run lint` | Currently broken — see Known gaps |

## Licence

Apache-2.0. See `LICENSE.txt`.
