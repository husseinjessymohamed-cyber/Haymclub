import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  StrictMode,
  useEffect,
  useState,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import App from './App';
import { AttendancePage } from './features/attendance/AttendancePage';
import { BillingPage } from './features/billing/BillingPage';
import { GroupsPage } from './features/groups/GroupsPage';
import { PortalLinksPage } from './features/portal/PortalLinksPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TraineesPage } from './features/trainees/TraineesPage';
import { UsersPage } from './features/users/UsersPage';

import './index.css';

const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus:
          false,
      },

      mutations: {
        retry: 0,
      },
    },
  });

function getCurrentRoute():
string {
  return window.location.hash
    .replace(/^#\/?/, '')
    .trim()
    .toLowerCase();
}

function RootApplication() {
  const [route, setRoute] =
    useState(
      getCurrentRoute,
    );

  useEffect(() => {
    function refreshRoute(): void {
      setRoute(
        getCurrentRoute(),
      );
    }

    window.addEventListener(
      'hashchange',
      refreshRoute,
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        refreshRoute,
      );
    };
  }, []);

  function backToDashboard(): void {
    window.location.hash = '';
  }

  if (route === 'trainees') {
    return (
      <TraineesPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'groups') {
    return (
      <GroupsPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'attendance') {
    return (
      <AttendancePage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'billing') {
    return (
      <BillingPage
        onBack={backToDashboard}
      />
    );
  }



  if (route === 'portal-links') {
    return (
      <PortalLinksPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'reports') {
    return (
      <ReportsPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'users') {
    return (
      <UsersPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === 'settings') {
    return (
      <SettingsPage
        onBack={backToDashboard}
      />
    );
  }

  return <App />;
}

const rootElement =
  document.getElementById(
    'root',
  );

if (!rootElement) {
  throw new Error(
    'Root element with id "root" was not found',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider
      client={queryClient}
    >
      <RootApplication />
    </QueryClientProvider>
  </StrictMode>,
);
