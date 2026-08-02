const TOKEN_KEYS = [
  'haymclub_auth_token',
  'haymclub_super_admin_token',
  'accessToken',
  'access_token',
  'token',
];

let redirecting = false;

function cleanStoredToken(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === 'string') {
      return parsed;
    }

    if (parsed && typeof parsed === 'object') {
      return (
        parsed.accessToken ??
        parsed.access_token ??
        parsed.token ??
        null
      );
    }
  } catch {
    // القيمة مخزنة كنص عادي.
  }

  return value.replace(/^"(.*)"$/, '$1').trim() || null;
}

function readToken(): string | null {
  const superAdminPage = window.location.hash.includes('super-admin');

  const preferredKeys = superAdminPage
    ? ['haymclub_super_admin_token', 'haymclub_auth_token', ...TOKEN_KEYS]
    : ['haymclub_auth_token', 'haymclub_super_admin_token', ...TOKEN_KEYS];

  for (const key of [...new Set(preferredKeys)]) {
    const localValue = cleanStoredToken(localStorage.getItem(key));
    if (localValue) return localValue;

    const sessionValue = cleanStoredToken(sessionStorage.getItem(key));
    if (sessionValue) return sessionValue;
  }

  return null;
}

function isApiRequest(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.pathname === '/api' || url.pathname.startsWith('/api/');
  } catch {
    return rawUrl.startsWith('/api/');
  }
}

function isPublicAuthRequest(rawUrl: string): boolean {
  try {
    const pathname = new URL(rawUrl, window.location.origin).pathname;

    return [
      '/api/auth/login',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/password-reset',
    ].some((path) => pathname.startsWith(path));
  } catch {
    return false;
  }
}

function clearAuthentication(): void {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function handleUnauthorized(rawUrl: string): void {
  if (
    redirecting ||
    !isApiRequest(rawUrl) ||
    isPublicAuthRequest(rawUrl)
  ) {
    return;
  }

  redirecting = true;
  const superAdminPage = window.location.hash.includes('super-admin');

  clearAuthentication();

  const loginUrl = superAdminPage
    ? `${window.location.origin}/#super-admin`
    : `${window.location.origin}/`;

  window.setTimeout(() => {
    window.location.replace(loginUrl);
  }, 50);
}

function bearerToken(token: string): string {
  return token.toLowerCase().startsWith('bearer ')
    ? token
    : `Bearer ${token}`;
}

function installFetchGuard(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const token = readToken();
    let response: Response;

    if (isApiRequest(rawUrl) && token) {
      if (input instanceof Request) {
        const headers = new Headers(input.headers);

        if (!headers.has('Authorization')) {
          headers.set('Authorization', bearerToken(token));
        }

        response = await originalFetch(
          new Request(input, { headers }),
          init,
        );
      } else {
        const headers = new Headers(init?.headers);

        if (!headers.has('Authorization')) {
          headers.set('Authorization', bearerToken(token));
        }

        response = await originalFetch(input, {
          ...init,
          headers,
        });
      }
    } else {
      response = await originalFetch(input, init);
    }

    if (response.status === 401) {
      handleUnauthorized(rawUrl);
    }

    return response;
  };
}

function installXhrGuard(): void {
  const prototype = XMLHttpRequest.prototype as XMLHttpRequest & {
    open: (...args: any[]) => any;
    send: (...args: any[]) => any;
    setRequestHeader: (...args: any[]) => any;
  };

  const originalOpen = prototype.open;
  const originalSend = prototype.send;
  const originalSetRequestHeader = prototype.setRequestHeader;

  prototype.open = function (...args: any[]) {
    (this as any).__haymclubUrl = String(args[1] ?? '');
    (this as any).__haymclubHasAuthorization = false;

    return originalOpen.apply(this, args);
  };

  prototype.setRequestHeader = function (
    name: string,
    value: string,
  ) {
    if (name.toLowerCase() === 'authorization') {
      (this as any).__haymclubHasAuthorization = true;
    }

    return originalSetRequestHeader.call(this, name, value);
  };

  prototype.send = function (...args: any[]) {
    const rawUrl = String((this as any).__haymclubUrl ?? '');
    const token = readToken();

    if (
      token &&
      isApiRequest(rawUrl) &&
      !(this as any).__haymclubHasAuthorization
    ) {
      originalSetRequestHeader.call(
        this,
        'Authorization',
        bearerToken(token),
      );
    }

    this.addEventListener(
      'load',
      () => {
        if (this.status === 401) {
          handleUnauthorized(rawUrl);
        }
      },
      { once: true },
    );

    return originalSend.apply(this, args);
  };
}

if (
  typeof window !== 'undefined' &&
  !(window as any).__haymclubAuthGuardInstalled
) {
  (window as any).__haymclubAuthGuardInstalled = true;
  installFetchGuard();
  installXhrGuard();
}
