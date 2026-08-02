import {
  config,
} from 'dotenv';

// إعدادات Codespaces والتطوير أولًا.
config({
  path: '.env.local',
  override: true,
});

// القيم الأساسية التي لا توجد في .env.local.
config({
  path: '.env',
  override: false,
});
