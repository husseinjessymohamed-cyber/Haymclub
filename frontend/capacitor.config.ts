import type {
  CapacitorConfig,
} from '@capacitor/cli';

type HaymclubVariant =
  | 'superadmin'
  | 'academy'
  | 'trainee';

const variant =
  (process.env.HAYMCLUB_APP ||
    'superadmin') as HaymclubVariant;

const apps = {
  superadmin: {
    appId: 'click.haym.superadmin',
    appName: 'Haymclub Super Admin',
    androidPath: 'android-superadmin',
  },

  academy: {
    appId: 'click.haym.academy',
    appName: 'Haymclub Academy',
    androidPath: 'android-academy',
  },

  trainee: {
    appId: 'click.haym.trainee',
    appName: 'Haymclub Trainee',
    androidPath: 'android-trainee',
  },
} as const;

const selected = apps[variant];

if (!selected) {
  throw new Error(
    `Unknown HAYMCLUB_APP: ${variant}`,
  );
}

const config: CapacitorConfig = {
  appId: selected.appId,
  appName: selected.appName,

  webDir: 'dist',

  android: {
    path: selected.androidPath,
  },

  server: {
    androidScheme: 'https',
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
