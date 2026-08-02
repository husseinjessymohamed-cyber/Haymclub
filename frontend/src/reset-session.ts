const params = new URLSearchParams(window.location.search);

if (params.get('reset-session') === '1') {
  const tokenKeys = [
    'haymclub_auth_token',
    'haymclub_super_admin_token',
    'accessToken',
    'access_token',
    'token',
  ];

  for (const key of tokenKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  sessionStorage.clear();
  params.delete('reset-session');

  const remainingQuery = params.toString();
  const cleanUrl =
    window.location.pathname +
    (remainingQuery ? `?${remainingQuery}` : '') +
    (window.location.hash || '#super-admin');

  window.history.replaceState({}, '', cleanUrl);
}
