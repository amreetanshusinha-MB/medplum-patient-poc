# Demo script — 5 minutes

A walkthrough of the Patient POC. Timings are cumulative and assume you are
**not** narrating the setup. Read the Before you start section at least once;
the demo falls apart if the data or the second login is not ready.

## Before you start

- [ ] Medplum stack up: `curl http://localhost:8103/healthcheck` returns `ok`
- [ ] Dev server running on <http://localhost:5173>
- [ ] `npm run seed` has been run (10 patients with vitals and problems)
- [ ] `npm run access-policy` has been run **with** `MEDPLUM_RESTRICTED_PASSWORD`
- [ ] Two browser profiles or windows open, so you are not logging in and out
      mid-demo:
      - **Window A** signed in as your admin/clinician user
      - **Window B** signed in as the front-desk user, parked on a patient chart
- [ ] Know one seeded patient with problems recorded — **Meera Pawar
      (MRN-100008)** has three conditions and three vitals sets, so she shows
      the fullest chart
- [ ] Zoom the browser to ~125% so vitals and codes are readable on a projector

If you have only one window, do the whole demo as the clinician and switch to
the front-desk user at 3:45 — budget an extra 30 seconds for the sign-in.

---

## 0:00 – 0:30 · Framing

**Say:**
> This is a patient registration and clinical record POC built on Medplum, which
> is a FHIR-native EHR platform. The point of it is that nothing here is stored
> in a schema I invented. Every record you are about to see is a standards
> compliant FHIR resource, and the access control at the end is enforced by the
> server, not by hiding buttons in the UI.

**Do:** Start on the patient list in Window A. Let the seeded patients be
visible behind you while you talk.

---

## 0:30 – 1:15 · Registration

**Do:**
1. Click **Register** in the sidebar.
2. Point at the pre-filled MRN, click **Regenerate** once.
3. Fill in a name, date of birth, gender, phone. Skip the address.
4. Click **Register patient** — it lands on the new patient's chart.

**Say:**
> The MRN is generated and checked for duplicates before we create anything —
> registering the same MRN twice is rejected rather than silently producing two
> records. That check is a FHIR search on the identifier, not a database
> constraint I bolted on.

**Watch out:** if the MRN collides with a seeded one you get a red alert. That
is the duplicate check working — say so and click Regenerate.

---

## 1:15 – 2:15 · Vitals

**Do:**
1. From the chart, open the **Vitals** tab.
2. Enter systolic **120**, diastolic **80**, pulse **72**, temperature **36.8**.
3. Before saving, type systolic **260** to trip the warning, then put it back
   to 120.
4. Click **Save vitals** — it returns to the chart.

**Say:**
> Two things worth calling out. First, the range check warns but does not block:
> a real reading can be alarming, and software that refuses to record it is
> worse than useless.

> Second, and this is the FHIR detail I would point at in a review — blood
> pressure is stored as **one** Observation, not two. The 85354-9 panel holds
> systolic and diastolic as components inside a single resource. A systolic
> number detached from the diastolic taken at the same moment is meaningless,
> so the standard keeps them together and so do we. Everything is written in one
> transaction, so a set of vitals lands atomically instead of half-saved.

---

## 2:15 – 3:00 · Problem list

**Do:**
1. Open the **Problems** tab on the same patient.
2. Note the blue banner about SNOMED.
3. Add a problem: type `Essential hypertension`, set onset, leave status
   Active / Confirmed, click **Add problem**.
4. Click **Resolve** on the row you just added — it disappears from the active
   list.

**Say:**
> The blue banner is honest about a real gap: this server has no SNOMED CT
> loaded, so the coded picker is unavailable and these problems are saved as
> free text. The app detects that at runtime rather than assuming. Load a
> SNOMED value set and the coded picker comes back with no code change.

> Resolving does not delete the row. It patches the clinical status to resolved,
> so the history survives — which is what you want in a clinical record.

---

## 3:00 – 3:45 · The chart summary

**Do:**
1. Navigate to **Meera Pawar (MRN-100008)**.
2. Land on the **Overview** tab. Point at the two panels.
3. Point specifically at the blood pressure row, rendered `120/80 mmHg`.

**Say:**
> Latest vitals and active problems. The blood pressure reads back out of those
> two components as a single value. Each reading shows how long ago it was
> taken, and it picks the newest reading per measurement independently — height
> from intake months ago, pulse from today, which is how charts actually look.

> Both panels come from **one GraphQL query**, not five REST calls. That is a
> concrete benefit of the platform being FHIR-native rather than a REST API
> someone wrapped a spec around.

---

## 3:45 – 5:00 · Access control — the closing beat

This is the beat to land. Do not rush it.

**Do:**
1. Switch to **Window B**, signed in as the front-desk user, on the same
   patient's chart.
2. Let the audience look at the Overview tab for a beat before speaking.
3. Point at the two grey **Restricted** panels.
4. Click the **Vitals** tab — restricted.
5. Click the **Problems** tab — restricted.
6. Go back to the patient list and **search for a patient** — this still works.
7. Click **Register** — the registration form still works.

**Say:**
> Same patient, same application, different user. This is the front-desk role.
> It can find patients and register them, because that is the job. It cannot
> see vitals or problems at all.

> The important part: I have not hidden anything in the UI. There is an
> AccessPolicy attached to this user's project membership that grants read and
> write on Patient, read-only on Practitioner, and **nothing** on Observation
> and Condition. Medplum's policies are allow-lists, so those two resources are
> denied simply by not appearing in the policy. If you opened the browser
> devtools and issued the request by hand, the server would refuse it.

**The line to close on** — point at the grey panel, then at an empty panel if
you have one:
> And notice this says "You don't have permission to view vitals", not "No
> vitals recorded". Those are completely different clinical facts. One means
> nobody took a blood pressure; the other means there is data here you are not
> cleared to see. A system that renders them the same way will get somebody
> hurt, so we made them look different on purpose.

---

## If you have another minute

- **Registration duplicate check:** register the same MRN twice, show the
  rejection.
- **Age-appropriate data:** open **Aarav Naik (MRN-100001)**, a six-month-old —
  pulse around 130, weight under 10 kg. The seed data is banded by age rather
  than one adult range for everyone.
- **Raw FHIR:** scroll below the Overview panels to the resource table, or open
  the **History** tab to show versioning.

## Questions you should expect

**"Is the data real?"**
No. Ten synthetic patients from `npm run seed`. Names, MRNs and addresses are
invented.

**"Could the front desk see the data by calling the API directly?"**
No — that is the point. The policy is enforced server-side on every request.

**"Why free-text conditions?"**
No SNOMED CT on this server. It is a licensing and loading task, not an
application change; the picker is already wired up and detects availability at
runtime.

**"Is this production ready?"**
No, and deliberately so. See the Production readiness section of the README —
hosting and backups, consent and retention, audit review, terminology, MFA and
HIPAA/ONC posture are all out of scope here.

**"What about visits/encounters?"**
Not modelled. Vitals and problems hang directly off the patient. Listed as a
known gap.
