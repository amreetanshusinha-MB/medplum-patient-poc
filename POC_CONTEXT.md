# Medplum POC — Patient Registration & Basic Clinical Record

## Goal
A demo-quality POC showing patient registration and a minimal clinical record
built on Medplum (FHIR-native EHR platform). Clinician-facing only, no patient portal.

## Environment
- Ubuntu, VS Code, Docker (requires `sudo` — AD-joined machine group issue)
- Medplum self-hosted via Docker Compose, project name `rx-demo-workshop3`
  - compose file: `~/Downloads/rx-demo-workshop (3)/docker-compose.yml`
  - server: http://localhost:8103 (healthy, v5.1.30)
  - admin app: http://localhost:3000
  - postgres 5432, redis 6379
  - **SMTP is not configured** — no email sends, so invite/reset links never arrive.
    Create users via the register flow or change password while authenticated.
- App: `~/Documents/POC/patient-poc`, Vite + React + TS, dev server on port 5173

## Medplum project
- Project: `patient-poc` (id `b4126656-a1e6-4b54-bac8-52f2eec459ff`)
- Login: `amreetanshu.sinha@mindbowser.com` (global user, not project-scoped)
- ClientApplication id: `2f982417-aabf-4ec7-8af8-b80ab5028484`
  (currently commented out in `.env` — passing it caused login failures for this
  global user; revisit when creating a project-scoped user)
- Two unusable invited users to delete later: `clinicpoc@yopmail.com`,
  `clinicalpoc2@yopmail.com` (no password, email delivery broken)

## Codebase
Forked from `medplum/medplum-hello-world`, git history removed, fresh repo.
- `.env` (gitignored): `MEDPLUM_BASE_URL=http://localhost:8103/`
- `vite.config.ts`: `envPrefix: ['MEDPLUM_','GOOGLE_','RECAPTCHA_']`, port 5173
- `src/main.tsx`: MedplumClient + MedplumProvider + MantineProvider
- `src/App.tsx`: AppShell + routes
- Existing pages: HomePage (Patient SearchControl), LandingPage, SignInPage,
  PatientPage (with overview/timeline/history tabs), ResourcePage, ResourceCreatePage
- Added: `src/pages/PatientRegistration.tsx` — hand-built Mantine form creating a
  Patient with MRN identifier (system `http://patient-poc.local/mrn`), name,
  birthDate, gender, telecom, address. Duplicate check via
  `medplum.searchOne('Patient', { identifier: 'system|value' })`.

## Scope decisions
In scope: Patient, Practitioner, Observation (vitals), Condition (problem list),
one AccessPolicy.
Out of scope: Encounter, AllergyIntolerance, MedicationRequest, Questionnaire,
Bots, patient portal.

## Plan status
- [x] Phase 0 — server verified, project + client created
- [x] Phase 1 — starter cloned, pointed at local server
- [x] Phase 2 — auth (came free with starter)
- [~] Phase 3 — registration form written, route wiring in progress
- [ ] Phase 4 — patient list & search
- [ ] Phase 5 — patient chart (vitals + problems panels)
- [ ] Phase 6 — vitals entry (LOINC: BP 85354-9, pulse 8867-4, temp 8310-5,
      height 8302-2, weight 29463-7; UCUM units) and Condition entry
- [ ] Phase 7 — seed data, AccessPolicy demo, loading/error states
- [ ] Phase 8 — README, demo script, "what production needs" list

## Current state
Route wiring for registration is done and the project type-checks clean
(`npx tsc --noEmit`, no errors).

- The duplicate `@tabler/icons-react` import in `src/App.tsx` was already gone by
  the time it was looked at — line 4 correctly imports both `IconUser` and
  `IconUserPlus`. Only leftover formatting from that earlier edit was tidied
  (a collapsed `],        },` brace and an over-indented route line).
- `/register` is declared above the catch-all `/:resourceType/:id`, so it is not
  swallowed as a resourceType. Sidebar has the Register link using `IconUserPlus`.
- `src/pages/PatientRegistration.tsx` was missing `import type { JSX } from 'react'`
  (TS2503, see Conventions). Added.
- `vitest/globals` removed from `tsconfig.json` types (see Conventions).

Not yet verified: the registration flow end to end against the local server —
submitting the form, the MRN duplicate check, and the redirect to
`/Patient/:id`. Phase 3 stays `[~]` until that is confirmed by hand.

## Creating a restricted (non-admin) user

**The `/register` flow at localhost:3000 cannot join the existing
`patient-poc` project.** Verified against this server: `POST /auth/newuser`
carrying a `projectId` is rejected with

    {"code":"invalid","details":{"text":"Recaptcha token is required"}}

Registering into an existing project is Medplum's *patient self-signup* path and
is gated behind a recaptcha site key configured on the Project, which this
project does not have. Registering without a `projectId` works but creates a
brand-new project, which is not what we want. The invite flow is separately
unusable here because SMTP is unconfigured, so the set-password email never
arrives.

The suggested fallback — admin creates the ProjectMembership, then the user sets
a password via the authenticated change-password page — does **not** work
either: an invited user has no password, so they cannot authenticate to reach
that page. It is a chicken-and-egg.

### Working procedure
Use the admin `invite` API with an explicit password and email suppressed. This
is what `scripts/access-policy.ts` does, and it needs no SMTP and no recaptcha:

```ts
medplum.invite(projectId, {
  resourceType: 'Practitioner',
  firstName: 'Front', lastName: 'Desk',
  email, password,          // password set directly — no email round trip
  sendEmail: false,         // SMTP is broken; do not try
  upsert: true,             // safe to re-run
  membership: { accessPolicy: { reference: 'AccessPolicy/<id>' } },
});
```

Run it with:

```
MEDPLUM_SEED_EMAIL=... MEDPLUM_SEED_PASSWORD=... \
MEDPLUM_RESTRICTED_EMAIL=frontdesk@yopmail.com \
MEDPLUM_RESTRICTED_PASSWORD=<at least 8 chars> \
npm run access-policy
```

Omitting `MEDPLUM_RESTRICTED_PASSWORD` creates the membership but leaves the
user unable to sign in; the script warns when that happens. Passwords must be
at least 8 characters (server-enforced).

## Access control demo
`scripts/access-policy.ts` creates an AccessPolicy named "Front desk" and
attaches it to the restricted user's ProjectMembership:

- `Patient` — read, vread, history, search, create, update (no delete)
- `Practitioner` — read, vread, history, search (read only)
- `Observation`, `Condition` — **no access**

Medplum's AccessPolicy is an allow-list: a resource type that is not listed is
denied. There is no "deny" entry to write, so Observation and Condition are
restricted simply by their absence from `AccessPolicy.resource`.

Note `AccessPolicyResource.readonly` is deprecated; use
`interaction: ['read','vread','history','search']` instead.

Signed in as the restricted user, the app should show "You don't have permission
to view this" on the Overview vitals and problems panels and on the Vitals and
Problems tabs, while patient search and registration keep working.

## Conventions
- Dev server must stay on 5173 (3000 is the Medplum admin app)
- Vite only reads `.env` at startup — restart after changing it
- Don't commit `.env`
- `@types/react` 19 no longer exposes `JSX` globally — the namespace lives only
  inside the React module. Every file annotating `JSX.Element` needs
  `import type { JSX } from 'react';` or it fails with TS2503
  ("Cannot find namespace 'JSX'"). `src/App.tsx` is the reference example.
- `vitest/globals` was removed from the `types` array in `tsconfig.json` — a
  medplum-hello-world starter leftover. `vitest` is not a dependency and there
  are no test files, so the dangling reference failed with TS2688 and broke both
  `npx tsc --noEmit` and `npm run build` (`build` is `tsc && vite build`).
  Re-add it alongside the dependency if tests come in later.
- Scripts in `scripts/` share sign-in via `scripts/medplum-auth.ts`; credentials
  always come from env vars, never hardcoded. Node has no `localStorage`, so the
  client is constructed with `new ClientStorage(new MemoryStorage())`.
- Signing in from Node logs "Failed to hash code verifier. Falling back to
  'plain' code challenge method ReferenceError: window is not defined". Harmless
  — `@medplum/core` hashes the PKCE verifier with `window.btoa`. Do **not** shim
  `window`: `@medplum/core` also branches on `typeof window` to decide it is in a
  browser, and faking it flips those paths. If the server ever rejects 'plain'
  challenges, switch the scripts to a ClientApplication with client credentials.
- An empty panel and a forbidden panel must look different in the UI — that
  distinction is the access-control demo. Use `isForbidden()` /
  `<ForbiddenPanel>` from `src/components/ForbiddenPanel.tsx` rather than letting
  a 403 fall through to a generic error or an empty list.
- `package-lock.json` is currently gitignored by the starter; should be un-ignored
  before packaging the POC