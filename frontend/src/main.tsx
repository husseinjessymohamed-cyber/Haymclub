import './reset-session';
import './auth-session-guard';
import { ClientPortalPage as HaymclubClientPortalPage } from "./features/portal/ClientPortalPage";
import {
  useEffect as useHaymclubRouteEffect,
  useState as useHaymclubRouteState,
} from "react";
import {
  useEffect as usePlatformEffect,
  useState as usePlatformState,
} from "react";
import { SuperAdminPage as PlatformSuperAdminPage } from "./features/super-admin/SuperAdminPage";
import { ClientPortalPage as PlatformClientPortalPage } from "./features/portal/ClientPortalPage";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { StrictMode, useEffect, useState } from "react";

import { createRoot } from "react-dom/client";

import App from "./App";
import { AttendancePage } from "./features/attendance/AttendancePage";
import { BillingPage } from "./features/billing/BillingPage";
import { GroupsPage } from "./features/groups/GroupsPage";
import { PortalLinksPage } from "./features/portal/PortalLinksPage";
import { PwaInstallPrompt } from "./features/pwa/PwaInstallPrompt";
import { AcademyRequestsPage } from "./features/workflow/AcademyRequestsPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TraineesPage } from "./features/trainees/TraineesPage";
import { UsersPage } from "./features/users/UsersPage";
import "./index.css";

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
  return window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
}

function AcademyRootApplication() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function refreshRoute(): void {
      setRoute(getCurrentRoute());
    }

    window.addEventListener("hashchange", refreshRoute);

    return () => {
      window.removeEventListener("hashchange", refreshRoute);
    };
  }, []);

  function backToDashboard(): void {
    window.location.hash = "";
  }

  if (route === "trainees") {
    return <TraineesPage onBack={backToDashboard} />;
  }

  if (route === "groups") {
    return <GroupsPage onBack={backToDashboard} />;
  }

  if (route === "attendance") {
    return <AttendancePage onBack={backToDashboard} />;
  }

  if (route === "billing") {
    return <BillingPage onBack={backToDashboard} />;
  }

  if (route === "academy-requests") {
    return (
      <AcademyRequestsPage
        onBack={backToDashboard}
      />
    );
  }

  if (route === "portal-links") {
    return <PortalLinksPage onBack={backToDashboard} />;
  }

  if (route === "reports") {
    return <ReportsPage onBack={backToDashboard} />;
  }

  if (route === "users") {
    return <UsersPage onBack={backToDashboard} />;
  }

  if (route === "settings") {
    return <SettingsPage onBack={backToDashboard} />;
  }


  

  return <App />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found');
}

// HAYMCLUB_PLATFORM_WRAPPER_V2
function readPlatformRoute(): string {
  return window.location.hash
    .replace(/^#\/?/, "")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

function RootApplication() {
  const [route, setRoute] = usePlatformState<string>(readPlatformRoute);

  usePlatformEffect(() => {
    const synchronize = () => {
      setRoute(readPlatformRoute());
    };

    window.addEventListener("hashchange", synchronize);

    synchronize();

    return () => {
      window.removeEventListener("hashchange", synchronize);
    };
  }, []);

  if (route === "super-admin") {
    return <PlatformSuperAdminPage />;
  }

  if (route === "client-portal" || route === "portal") {
    return (
      <PlatformClientPortalPage
        onLogout={() => {
          window.location.hash = "";
        }}
      />
    );
  }

  return <AcademyRootApplication />;
}

// HAYMCLUB_PLATFORM_WRAPPER_V2_END

/* HAYMCLUB_CLIENT_PORTAL_ROUTER_START */
function HaymclubRootRouter() {
  const [activeHash, setActiveHash] = useHaymclubRouteState(
    () => window.location.hash,
  );

  useHaymclubRouteEffect(() => {
    const syncRoute = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener("hashchange", syncRoute);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  const normalizedRoute = activeHash
    .replace(/^#\/?/, "")
    .split("?")[0]
    .toLowerCase();

  const isClientPortal =
    normalizedRoute === "client-portal" ||
    normalizedRoute === "portal" ||
    normalizedRoute.startsWith("client-portal/");

  const handleClientPortalLogout = () => {
    localStorage.removeItem("haymclub_portal_token");

    localStorage.removeItem("haymclub_token");

    sessionStorage.removeItem("haymclub_portal_token");

    window.location.hash = "#client-portal";

    window.location.reload();
  };

  if (isClientPortal) {
    return <HaymclubClientPortalPage onLogout={handleClientPortalLogout} />;
  }

  return <RootApplication />;
}
/* HAYMCLUB_CLIENT_PORTAL_ROUTER_END */

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HaymclubRootRouter />
      <PwaInstallPrompt />
    </QueryClientProvider>
  </StrictMode>,
);
