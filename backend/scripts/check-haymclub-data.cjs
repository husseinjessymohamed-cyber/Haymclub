require('dotenv').config({ path: '.env', quiet: true });
require('dotenv').config({
  path: '.env.local',
  override: true,
  quiet: true,
});

const { Client } = require('pg');
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

(async () => {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات\n');

    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename ~* 'academ|branch|trainee|guardian|attendance|subscription|payment|user'
      ORDER BY tablename
    `);

    console.log('البيانات الحالية:');
    console.log('------------------------------------------');

    for (const { tablename } of tables.rows) {
      const safeName = tablename.replace(/"/g, '""');
      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM "${safeName}"`
      );

      console.log(
        tablename.padEnd(35),
        result.rows[0].count
      );
    }

    console.log('------------------------------------------');
  } catch (error) {
    console.error('❌ فشل الفحص:', error.message);

    console.log('\nأسماء متغيرات قاعدة البيانات الموجودة:');
    Object.keys(env)
      .filter((key) => /DATABASE|POSTGRES|^DB_/i.test(key))
      .sort()
      .forEach((key) => console.log('- ' + key));

    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
