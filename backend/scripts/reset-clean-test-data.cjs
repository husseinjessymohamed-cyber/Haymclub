const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: '.env', quiet: true });
require('dotenv').config({
  path: '.env.local',
  override: true,
  quiet: true,
});

if (process.env.CODESPACES !== 'true') {
  console.error('❌ تم إلغاء العملية: مسموح بالتنفيذ داخل Codespaces فقط');
  process.exit(1);
}

const env = process.env;

const connectionString =
  env.DATABASE_URL ||
  env.DB_URL ||
  env.POSTGRES_URL;

const config = connectionString
  ? { connectionString }
  : {
      host:
        env.DB_HOST ||
        env.DATABASE_HOST ||
        env.POSTGRES_HOST ||
        '127.0.0.1',

      port: Number(
        env.DB_PORT ||
        env.DATABASE_PORT ||
        env.POSTGRES_PORT ||
        5432
      ),

      user:
        env.DB_USERNAME ||
        env.DB_USER ||
        env.DATABASE_USER ||
        env.POSTGRES_USER,

      password:
        env.DB_PASSWORD ||
        env.DATABASE_PASSWORD ||
        env.POSTGRES_PASSWORD,

      database:
        env.DB_DATABASE ||
        env.DB_NAME ||
        env.DATABASE_NAME ||
        env.POSTGRES_DB,
    };

const target = String(
  connectionString ||
  `${config.host}/${config.database}`
).toLowerCase();

if (
  target.includes('amazonaws.com') ||
  target.includes('rds.amazonaws.com') ||
  target.includes('haym.click')
) {
  console.error('❌ تم رفض المسح: قاعدة البيانات تبدو إنتاجية');
  process.exit(1);
}

const preservedTables = new Set([
  'migrations',
  'typeorm_metadata',
  'roles',
  'permissions',
  'role_permissions',
  'sports',
  'subscription_plans',
  'saas_plans',
  'system_settings',
  'system_configurations',
]);

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

(async () => {
  const client = new Client(config);

  try {
    await client.connect();

    const tableResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const resetTables = tableResult.rows
      .map((row) => row.tablename)
      .filter((table) => !preservedTables.has(table))
      .filter((table) => !table.toLowerCase().includes('migration'));

    if (!resetTables.length) {
      throw new Error('لم يتم العثور على جداول لمسحها');
    }

    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backupDirectory = path.join(
      '/workspaces/Haymclub/project-backups',
      `clean-reset-${stamp}`
    );

    fs.mkdirSync(backupDirectory, { recursive: true });

    const backup = {};

    for (const table of resetTables) {
      const result = await client.query(
        `SELECT * FROM ${quoteIdentifier(table)}`
      );

      backup[table] = result.rows;
    }

    const backupFile = path.join(
      backupDirectory,
      'database-before-reset.json'
    );

    fs.writeFileSync(
      backupFile,
      JSON.stringify(backup, null, 2),
      { mode: 0o600 }
    );

    console.log(`📦 النسخة الاحتياطية: ${backupFile}`);

    await client.query('BEGIN');

    const tableList = resetTables
      .map(quoteIdentifier)
      .join(', ');

    await client.query(
      `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`
    );

    await client.query('COMMIT');

    console.log('✅ تم حذف كل بيانات التجربة');
    console.log(`عدد الجداول التي تم تنظيفها: ${resetTables.length}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ فشل التنظيف:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
