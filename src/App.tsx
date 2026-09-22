// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Loader } from '@mantine/core';
import { ErrorBoundary, useMedplum, useMedplumProfile } from '@medplum/react';
import { Suspense } from 'react';
import type { JSX } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { PatientHistory } from './components/PatientHistory';
import { PatientOverview } from './components/PatientOverview';
import { Timeline } from './components/Timeline';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { PatientPage } from './pages/PatientPage';
import { PatientRegistration } from './pages/PatientRegistration';
import { ProblemEntry } from './pages/ProblemEntry';
import { ResourceCreatePage } from './pages/ResourceCreatePage';
import { ResourcePage } from './pages/ResourcePage';
import { SignInPage } from './pages/SignInPage';
import { VitalsEntry } from './pages/VitalsEntry';

/** Routes shared by both the signed-in and signed-out trees. */
function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/register" element={<PatientRegistration />} />
      <Route path="/Patient/new" element={<ResourceCreatePage />} />
      <Route path="/Patient/:id" element={<PatientPage />}>
        <Route index element={<PatientOverview />} />
        <Route path="overview" element={<PatientOverview />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="history" element={<PatientHistory />} />
        <Route path="vitals" element={<VitalsEntry />} />
        <Route path="problems" element={<ProblemEntry />} />
      </Route>
      {/* Kept for inspecting raw FHIR while debugging. */}
      <Route path="/:resourceType/:id" element={<ResourcePage />} />
      <Route path="/:resourceType/:id/_history/:versionId" element={<ResourcePage />} />
    </Routes>
  );
}

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  if (medplum.isLoading()) {
    return null;
  }

  // Signed out: no chrome at all, just the landing / sign-in screen.
  if (!profile) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}
