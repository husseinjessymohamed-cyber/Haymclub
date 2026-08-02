const { Client } = require('pg');
const { randomUUID } = require('crypto');

require('dotenv').config({
  path: '.env',
});

require('dotenv').config({
  path: '.env.local',
  override: true,
});

const SPORTS = [
  ['FOOTBALL', 'كرة القدم', 'Football'],
  ['FUTSAL', 'كرة القدم الخماسية', 'Futsal'],
  ['BASKETBALL', 'كرة السلة', 'Basketball'],
  ['HANDBALL', 'كرة اليد', 'Handball'],
  ['VOLLEYBALL', 'الكرة الطائرة', 'Volleyball'],
  ['BEACH_VOLLEYBALL', 'الكرة الطائرة الشاطئية', 'Beach Volleyball'],
  ['SWIMMING', 'السباحة', 'Swimming'],
  ['WATER_POLO', 'كرة الماء', 'Water Polo'],
  ['DIVING', 'الغطس', 'Diving'],
  ['ARTISTIC_SWIMMING', 'السباحة الفنية', 'Artistic Swimming'],
  ['ATHLETICS', 'ألعاب القوى', 'Athletics'],
  ['ARTISTIC_GYMNASTICS', 'الجمباز الفني', 'Artistic Gymnastics'],
  ['RHYTHMIC_GYMNASTICS', 'الجمباز الإيقاعي', 'Rhythmic Gymnastics'],
  ['AEROBIC_GYMNASTICS', 'جمباز الأيروبيك', 'Aerobic Gymnastics'],
  ['TENNIS', 'التنس الأرضي', 'Tennis'],
  ['TABLE_TENNIS', 'تنس الطاولة', 'Table Tennis'],
  ['SQUASH', 'الإسكواش', 'Squash'],
  ['PADEL', 'البادل', 'Padel'],
  ['BADMINTON', 'الريشة الطائرة', 'Badminton'],
  ['FIELD_HOCKEY', 'الهوكي', 'Field Hockey'],
  ['BOXING', 'الملاكمة', 'Boxing'],
  ['WRESTLING', 'المصارعة', 'Wrestling'],
  ['JUDO', 'الجودو', 'Judo'],
  ['KARATE', 'الكاراتيه', 'Karate'],
  ['TAEKWONDO', 'التايكوندو', 'Taekwondo'],
  ['WUSHU', 'الكونغ فو - ووشو', 'Wushu'],
  ['KICKBOXING', 'الكيك بوكسينج', 'Kickboxing'],
  ['MUAY_THAI', 'المواي تاي', 'Muay Thai'],
  ['MMA', 'الفنون القتالية المختلطة', 'Mixed Martial Arts'],
  ['JIU_JITSU', 'الجوجيتسو', 'Jiu-Jitsu'],
  ['FENCING', 'السلاح - المبارزة', 'Fencing'],
  ['WEIGHTLIFTING', 'رفع الأثقال', 'Weightlifting'],
  ['POWERLIFTING', 'القوة البدنية', 'Powerlifting'],
  ['BODYBUILDING', 'كمال الأجسام', 'Bodybuilding'],
  ['CROSSFIT', 'اللياقة البدنية والكروس فت', 'CrossFit'],
  ['SHOOTING', 'الرماية', 'Shooting'],
  ['ARCHERY', 'القوس والسهم', 'Archery'],
  ['EQUESTRIAN', 'الفروسية', 'Equestrian'],
  ['ROWING', 'التجديف', 'Rowing'],
  ['CANOE_KAYAK', 'الكانوي والكياك', 'Canoe and Kayak'],
  ['SAILING', 'الشراع', 'Sailing'],
  ['CYCLING', 'ركوب الدراجات', 'Cycling'],
  ['TRIATHLON', 'الترايثلون', 'Triathlon'],
  ['MODERN_PENTATHLON', 'الخماسي الحديث', 'Modern Pentathlon'],
  ['RUGBY', 'الرجبي', 'Rugby'],
  ['AMERICAN_FOOTBALL', 'كرة القدم الأمريكية', 'American Football'],
  ['BASEBALL', 'البيسبول', 'Baseball'],
  ['SOFTBALL', 'السوفت بول', 'Softball'],
  ['BILLIARDS_SNOOKER', 'البلياردو والسنوكر', 'Billiards and Snooker'],
  ['CHESS', 'الشطرنج', 'Chess'],
];

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function getDatabaseConfig() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DB_URL;

  const useSsl = /^(true|1|yes)$/i.test(
    process.env.DATABASE_SSL ||
    process.env.DB_SSL ||
    'false',
  );

  if (connectionString) {
    return {
      connectionString,
      ...(useSsl
        ? {
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {}),
    };
  }

  return {
    host:
      process.env.DB_HOST ||
      '127.0.0.1',

    port: Number(
      process.env.DB_PORT ||
      5432,
    ),

    user:
      process.env.DB_USERNAME ||
      process.env.DB_USER ||
      'postgres',

    password:
      process.env.DB_PASSWORD ||
      '',

    database:
      process.env.DB_DATABASE ||
      process.env.DB_NAME ||
      'postgres',
  };
}

async function findTable(client, possibleNames) {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND LOWER(table_name) = ANY($1::text[])
      ORDER BY table_name
      LIMIT 1
    `,
    [possibleNames.map((name) => name.toLowerCase())],
  );

  return result.rows[0]?.table_name || null;
}

async function getColumns(client, tableName) {
  const result = await client.query(
    `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        is_identity,
        is_generated
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );

  return result.rows;
}

function makeColumnPicker(columns) {
  const byLowerCase = new Map(
    columns.map((column) => [
      column.column_name.toLowerCase(),
      column.column_name,
    ]),
  );

  return (...possibleNames) => {
    for (const name of possibleNames) {
      const found = byLowerCase.get(
        name.toLowerCase(),
      );

      if (found) {
        return found;
      }
    }

    return null;
  };
}

async function getAcademyIds(
  client,
  academyColumn,
  academyRequired,
) {
  const academiesTable = await findTable(
    client,
    ['academies', 'academy'],
  );

  if (!academiesTable) {
    if (academyRequired) {
      throw new Error(
        'جدول الرياضات يحتاج academy_id، لكن جدول academies غير موجود.',
      );
    }

    return [null];
  }

  const columns = await getColumns(
    client,
    academiesTable,
  );

  const pick = makeColumnPicker(columns);

  const idColumn = pick('id');

  if (!idColumn) {
    throw new Error(
      `لم يتم العثور على عمود id داخل جدول ${academiesTable}.`,
    );
  }

  const deletedAtColumn = pick(
    'deleted_at',
    'deletedAt',
  );

  const where = deletedAtColumn
    ? `WHERE ${quoteIdentifier(deletedAtColumn)} IS NULL`
    : '';

  const result = await client.query(`
    SELECT ${quoteIdentifier(idColumn)} AS id
    FROM ${quoteIdentifier(academiesTable)}
    ${where}
    ORDER BY ${quoteIdentifier(idColumn)}
  `);

  const ids = result.rows
    .map((row) => row.id)
    .filter(Boolean);

  if (ids.length === 0) {
    if (academyRequired) {
      throw new Error(
        'لا توجد أكاديميات داخل قاعدة البيانات لإضافة الرياضات إليها.',
      );
    }

    return [null];
  }

  return ids;
}

function getIdValue(idColumnDetails) {
  if (!idColumnDetails) {
    return undefined;
  }

  const type = String(
    idColumnDetails.data_type ||
    '',
  ).toLowerCase();

  if (
    type === 'uuid' ||
    type.includes('character') ||
    type === 'text'
  ) {
    return randomUUID();
  }

  return undefined;
}

async function main() {
  const client = new Client(
    getDatabaseConfig(),
  );

  await client.connect();

  console.log(
    '✅ تم الاتصال بقاعدة البيانات',
  );

  const sportsTable = await findTable(
    client,
    ['sports', 'sport'],
  );

  if (!sportsTable) {
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.error(
      '❌ لم يتم العثور على جدول sports.',
    );

    console.error(
      'الجداول الموجودة:',
    );

    for (const row of tablesResult.rows) {
      console.error(
        `- ${row.table_name}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    `✅ جدول الرياضات: ${sportsTable}`,
  );

  const columns = await getColumns(
    client,
    sportsTable,
  );

  const pick = makeColumnPicker(columns);

  const idColumn = pick('id');

  const codeColumn = pick(
    'code',
    'sport_code',
    'sportCode',
    'slug',
  );

  const nameColumn = pick(
    'name',
    'title',
  );

  const arabicNameColumn = pick(
    'name_ar',
    'arabic_name',
    'nameAr',
    'arabicName',
  );

  const englishNameColumn = pick(
    'name_en',
    'english_name',
    'nameEn',
    'englishName',
  );

  const descriptionColumn = pick(
    'description',
    'notes',
  );

  const activeColumn = pick(
    'is_active',
    'isActive',
    'active',
    'enabled',
  );

  const academyColumn = pick(
    'academy_id',
    'academyId',
  );

  const deletedAtColumn = pick(
    'deleted_at',
    'deletedAt',
  );

  const createdAtColumn = pick(
    'created_at',
    'createdAt',
  );

  const updatedAtColumn = pick(
    'updated_at',
    'updatedAt',
  );

  if (
    !nameColumn &&
    !arabicNameColumn
  ) {
    throw new Error(
      'لم يتم العثور على عمود اسم الرياضة مثل name أو name_ar.',
    );
  }

  const academyDetails = academyColumn
    ? columns.find(
        (column) =>
          column.column_name ===
          academyColumn,
      )
    : null;

  const academyRequired =
    academyDetails?.is_nullable === 'NO' &&
    !academyDetails?.column_default;

  const academyIds = academyColumn
    ? await getAcademyIds(
        client,
        academyColumn,
        academyRequired,
      )
    : [null];

  console.log(
    academyColumn
      ? `✅ سيتم إضافة الرياضات إلى ${academyIds.length} أكاديمية`
      : '✅ جدول الرياضات عام وغير مرتبط بأكاديمية',
  );

  const idDetails = idColumn
    ? columns.find(
        (column) =>
          column.column_name ===
          idColumn,
      )
    : null;

  let inserted = 0;
  let updated = 0;

  await client.query('BEGIN');

  try {
    for (const academyId of academyIds) {
      for (
        let index = 0;
        index < SPORTS.length;
        index += 1
      ) {
        const [
          code,
          arabicName,
          englishName,
        ] = SPORTS[index];

        const values = {};

        if (idColumn) {
          const generatedId =
            getIdValue(idDetails);

          if (generatedId !== undefined) {
            values[idColumn] =
              generatedId;
          }
        }

        if (codeColumn) {
          values[codeColumn] =
            code;
        }

        if (nameColumn) {
          values[nameColumn] =
            arabicName;
        }

        if (arabicNameColumn) {
          values[arabicNameColumn] =
            arabicName;
        }

        if (englishNameColumn) {
          values[englishNameColumn] =
            englishName;
        }

        if (descriptionColumn) {
          values[descriptionColumn] =
            `${arabicName} | ${englishName}`;
        }

        if (activeColumn) {
          values[activeColumn] =
            true;
        }

        if (academyColumn) {
          values[academyColumn] =
            academyId;
        }

        if (deletedAtColumn) {
          values[deletedAtColumn] =
            null;
        }

        if (createdAtColumn) {
          values[createdAtColumn] =
            new Date();
        }

        if (updatedAtColumn) {
          values[updatedAtColumn] =
            new Date();
        }

        const missingRequired =
          columns.filter((column) => {
            const generated =
              column.is_identity === 'YES' ||
              (
                column.is_generated &&
                column.is_generated !== 'NEVER'
              );

            return (
              column.is_nullable === 'NO' &&
              !column.column_default &&
              !generated &&
              !Object.prototype.hasOwnProperty.call(
                values,
                column.column_name,
              )
            );
          });

        if (missingRequired.length > 0) {
          throw new Error(
            `هناك أعمدة إجبارية غير معروفة داخل جدول ${sportsTable}: ` +
            missingRequired
              .map(
                (column) =>
                  column.column_name,
              )
              .join(', '),
          );
        }

        const whereParts = [];
        const whereValues = [];

        if (codeColumn) {
          whereValues.push(code);

          whereParts.push(
            `LOWER(CAST(${quoteIdentifier(codeColumn)} AS TEXT)) = LOWER($${whereValues.length})`,
          );
        } else {
          const lookupNameColumn =
            arabicNameColumn ||
            nameColumn;

          whereValues.push(
            arabicName,
          );

          whereParts.push(
            `LOWER(CAST(${quoteIdentifier(lookupNameColumn)} AS TEXT)) = LOWER($${whereValues.length})`,
          );
        }

        if (academyColumn) {
          whereValues.push(
            academyId,
          );

          whereParts.push(
            `${quoteIdentifier(academyColumn)} IS NOT DISTINCT FROM $${whereValues.length}`,
          );
        }

        const existingResult =
          await client.query(
            `
              SELECT *
              FROM ${quoteIdentifier(sportsTable)}
              WHERE ${whereParts.join(' AND ')}
              LIMIT 1
            `,
            whereValues,
          );

        if (
          existingResult.rows.length > 0
        ) {
          const existing =
            existingResult.rows[0];

          const updateValues = {};

          if (codeColumn) {
            updateValues[codeColumn] =
              code;
          }

          if (nameColumn) {
            updateValues[nameColumn] =
              arabicName;
          }

          if (arabicNameColumn) {
            updateValues[arabicNameColumn] =
              arabicName;
          }

          if (englishNameColumn) {
            updateValues[englishNameColumn] =
              englishName;
          }

          if (descriptionColumn) {
            updateValues[descriptionColumn] =
              `${arabicName} | ${englishName}`;
          }

          if (activeColumn) {
            updateValues[activeColumn] =
              true;
          }

          if (deletedAtColumn) {
            updateValues[deletedAtColumn] =
              null;
          }

          if (updatedAtColumn) {
            updateValues[updatedAtColumn] =
              new Date();
          }

          const updateEntries =
            Object.entries(updateValues);

          const setSql =
            updateEntries
              .map(
                ([column], position) =>
                  `${quoteIdentifier(column)} = $${position + 1}`,
              )
              .join(', ');

          const updateParams =
            updateEntries.map(
              ([, value]) => value,
            );

          if (idColumn && existing[idColumn]) {
            updateParams.push(
              existing[idColumn],
            );

            await client.query(
              `
                UPDATE ${quoteIdentifier(sportsTable)}
                SET ${setSql}
                WHERE ${quoteIdentifier(idColumn)} = $${updateParams.length}
              `,
              updateParams,
            );
          } else {
            const finalWhereValues = [
              ...updateParams,
              ...whereValues,
            ];

            const shiftedWhere =
              whereParts
                .join(' AND ')
                .replace(
                  /\$(\d+)/g,
                  (_, number) =>
                    `$${Number(number) + updateParams.length}`,
                );

            await client.query(
              `
                UPDATE ${quoteIdentifier(sportsTable)}
                SET ${setSql}
                WHERE ${shiftedWhere}
              `,
              finalWhereValues,
            );
          }

          updated += 1;
        } else {
          const entries =
            Object.entries(values);

          const insertColumns =
            entries
              .map(([column]) =>
                quoteIdentifier(column),
              )
              .join(', ');

          const insertPlaceholders =
            entries
              .map(
                (_, position) =>
                  `$${position + 1}`,
              )
              .join(', ');

          const insertValues =
            entries.map(
              ([, value]) => value,
            );

          await client.query(
            `
              INSERT INTO ${quoteIdentifier(sportsTable)}
              (${insertColumns})
              VALUES (${insertPlaceholders})
            `,
            insertValues,
          );

          inserted += 1;
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  console.log('');
  console.log(
    '========================================',
  );
  console.log(
    '✅ تم تجهيز الرياضات بنجاح',
  );
  console.log(
    `➕ رياضات جديدة: ${inserted}`,
  );
  console.log(
    `♻️ رياضات تم تحديثها: ${updated}`,
  );
  console.log(
    `📋 عدد الرياضات الأساسية: ${SPORTS.length}`,
  );

  if (academyColumn) {
    console.log(
      `🏢 عدد الأكاديميات: ${academyIds.length}`,
    );

    console.log(
      `📊 العدد المتوقع الكلي: ${SPORTS.length * academyIds.length}`,
    );
  }

  console.log(
    '========================================',
  );

  const countWhere = deletedAtColumn
    ? `WHERE ${quoteIdentifier(deletedAtColumn)} IS NULL`
    : '';

  if (academyColumn) {
    const counts =
      await client.query(`
        SELECT
          ${quoteIdentifier(academyColumn)} AS academy_id,
          COUNT(*)::int AS sports_count
        FROM ${quoteIdentifier(sportsTable)}
        ${countWhere}
        GROUP BY ${quoteIdentifier(academyColumn)}
        ORDER BY ${quoteIdentifier(academyColumn)}
      `);

    console.log('');
    console.log(
      'عدد الرياضات لكل أكاديمية:',
    );

    console.table(counts.rows);
  } else {
    const count =
      await client.query(`
        SELECT COUNT(*)::int AS sports_count
        FROM ${quoteIdentifier(sportsTable)}
        ${countWhere}
      `);

    console.log(
      `عدد الرياضات داخل الجدول: ${count.rows[0].sports_count}`,
    );
  }

  const displayColumns = [
    codeColumn,
    nameColumn ||
      arabicNameColumn,
    englishNameColumn,
    academyColumn,
  ].filter(Boolean);

  const preview =
    await client.query(`
      SELECT
        ${displayColumns
          .map((column) =>
            quoteIdentifier(column),
          )
          .join(', ')}
      FROM ${quoteIdentifier(sportsTable)}
      ${countWhere}
      ORDER BY ${
        codeColumn
          ? quoteIdentifier(codeColumn)
          : quoteIdentifier(
              nameColumn ||
              arabicNameColumn,
            )
      }
      LIMIT 15
    `);

  console.log('');
  console.log(
    'عينة من الرياضات:',
  );

  console.table(preview.rows);

  await client.end();
}

main().catch((error) => {
  console.error('');
  console.error(
    '❌ فشل تجهيز الرياضات:',
  );

  console.error(
    error?.stack ||
    error?.message ||
    error,
  );

  process.exit(1);
});
