import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  StrictMode,
  useEffect,
  useState,
} from 'react';

import { createRoot } from 'react-dom/client';

import App from './App';
import { AttendancePage } from './features/attendance/AttendancePage';
import { BillingPage } from './features/billing/BillingPage';
import { GroupsPage } from './features/groups/GroupsPage';
import { TraineesPage } from './features/trainees/TraineesPage';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },

    mutations: {
      retry: 0,
    },
  },
});

function getCurrentRoute(): string {
  return window.location.hash
    .replace(/^#\/?/, '')
    .trim()
    .toLowerCase();
}

function RootApplication() {
  const [route, setRoute] = useState(
    getCurrentRoute(),
  );

  const [authenticated, setAuthenticated] =
    useState(() =>
      Boolean(
        localStorage.getItem(
          'haymclub_token',
        ),
      ),
    );

  useEffect(() => {
    const refreshRoute = (): void => {
      setRoute(getCurrentRoute());
    };

    const refreshAuthentication = (): void => {
      setAuthenticated(
        Boolean(
          localStorage.getItem(
            'haymclub_token',
          ),
        ),
      );
    };

    window.addEventListener(
      'hashchange',
      refreshRoute,
    );

    window.addEventListener(
      'storage',
      refreshAuthentication,
    );

    const timer = window.setInterval(
      refreshAuthentication,
      700,
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        refreshRoute,
      );

      window.removeEventListener(
        'storage',
        refreshAuthentication,
      );

      window.clearInterval(timer);
    };
  }, []);

  if (route === 'trainees') {
    return (
      <TraineesPage
        onBack={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  if (route === 'groups') {
    return (
      <GroupsPage
        onBack={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  if (route === 'attendance') {
    return (
      <AttendancePage
        onBack={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  if (route === 'billing') {
    return (
      <BillingPage
        onBack={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <>
      <App />

      {authenticated && (
        <div className="haymclub-page-shortcuts">
          <button
            type="button"
            className="haymclub-trainees-shortcut"
            onClick={() => {
              window.location.hash =
                'trainees';
            }}
          >
            👥 إدارة المتدربين
          </button>

          <button
            type="button"
            className="haymclub-groups-shortcut"
            onClick={() => {
              window.location.hash =
                'groups';
            }}
          >
            ⚽ إدارة المجموعات
          </button>

          <button
            type="button"
            className="haymclub-groups-shortcut"
            onClick={() => {
              window.location.hash =
                'attendance';
            }}
          >
            📋 الحضور والغياب
          </button>

          <button
            type="button"
            className="haymclub-groups-shortcut"
            onClick={() => {
              window.location.hash =
                'billing';
            }}
          >
            💳 الاشتراكات
          </button>
        </div>
      )}
    </>
  );
}

const rootElement =
  document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Root element with id "root" was not found',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootApplication />
    </QueryClientProvider>
  </StrictMode>,
);
