import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL =
  __ENV.BASE_URL || 'https://haym.click/api';

const VUS =
  Number(__ENV.VUS || 100);

const DURATION =
  __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    portal_load: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '10s',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [
      'p(95)<1500',
      'p(99)<3000',
    ],
  },
};

export function setup() {
  const email =
    __ENV.TEST_EMAIL;

  const password =
    __ENV.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL and TEST_PASSWORD are required'
    );
  }

  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email,
      password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  );

  const loginOk = check(
    response,
    {
      'login successful': (r) =>
        r.status === 200 ||
        r.status === 201,
    },
  );

  if (!loginOk) {
    throw new Error(
      `Login failed: HTTP ${response.status}`
    );
  }

  const body = response.json();

  const data =
    body &&
    typeof body === 'object' &&
    body.data &&
    typeof body.data === 'object'
      ? body.data
      : body;

  const token =
    data.accessToken ||
    data.access_token;

  if (!token) {
    throw new Error(
      'Access token not received'
    );
  }

  return {
    token,
  };
}

export default function (data) {
  const response = http.get(
    `${BASE_URL}/portal/me`,
    {
      headers: {
        Accept: 'application/json',
        Authorization:
          `Bearer ${data.token}`,
      },

      tags: {
        endpoint: 'portal-me',
      },
    },
  );

  check(
    response,
    {
      'portal HTTP 200': (r) =>
        r.status === 200,

      'portal response < 2 sec': (r) =>
        r.timings.duration < 2000,
    },
  );

  // Simulates a user reading the screen
  sleep(
    1 + Math.random() * 2
  );
}
