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
import { TraineesPage } from './features/trainees/TraineesPage';

import './index.css';

/*
 * يجب إنشاء نسخة واحدة فقط من QueryClient خارج المكونات،
 * حتى لا يُعاد إنشاؤها عند كل Render.
 */
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
  /*
   * يدعم الصيغتين:
   * #trainees
   * #/trainees
   */
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
        localStorage.getItem('haymclub_token'),
      ),
    );

  useEffect(() => {
    const handleHashChange = (): void => {
      setRoute(getCurrentRoute());
    };

    const refreshAuthentication = (): void => {
      setAuthenticated(
        Boolean(
          localStorage.getItem('haymclub_token'),
        ),
      );
    };

    window.addEventListener(
      'hashchange',
      handleHashChange,
    );

    window.addEventListener(
      'storage',
      refreshAuthentication,
    );

    const authenticationTimer =
      window.setInterval(
        refreshAuthentication,
        700,
      );

    return () => {
      window.removeEventListener(
        'hashchange',
        handleHashChange,
      );

      window.removeEventListener(
        'storage',
        refreshAuthentication,
      );

      window.clearInterval(
        authenticationTimer,
      );
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

  return (
    <>
      <App />

      {authenticated && (
        <button
          type="button"
          className="haymclub-trainees-shortcut"
          onClick={() => {
            window.location.hash = 'trainees';
          }}
        >
          👥 إدارة المتدربين
        </button>
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
