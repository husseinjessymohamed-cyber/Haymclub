import '../src/config/load-env';

import * as nodemailer from 'nodemailer';

function requiredEnvironment(
  name: string,
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} غير موجود أو فارغ`,
    );
  }

  return value;
}

async function run(): Promise<void> {
  const host =
    requiredEnvironment(
      'SMTP_HOST',
    );

  const port = Number(
    requiredEnvironment(
      'SMTP_PORT',
    ),
  );

  const secure =
    requiredEnvironment(
      'SMTP_SECURE',
    ) === 'true';

  const user =
    requiredEnvironment(
      'SMTP_USER',
    );

  const password =
    requiredEnvironment(
      'SMTP_PASS',
    );

  const recipient =
    process.env.SMTP_TEST_TO
      ?.trim() || user;

  const from =
    process.env.SMTP_FROM
      ?.trim() ||
    `Haymclub <${user}>`;

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'SMTP_PORT غير صالح',
    );
  }

  console.log(
    `Host: ${host}`,
  );

  console.log(
    `Port: ${port}`,
  );

  console.log(
    `Secure: ${secure}`,
  );

  console.log(
    `User: ${user}`,
  );

  console.log(
    `Test recipient: ${recipient}`,
  );

  const transporter =
    nodemailer.createTransport({
      host,
      port,
      secure,

      auth: {
        user,
        pass: password,
      },

      connectionTimeout:
        20_000,

      greetingTimeout:
        20_000,

      socketTimeout:
        40_000,
    });

  await transporter.verify();

  console.log(
    '✅ الاتصال بخادم البريد ناجح',
  );

  const result =
    await transporter.sendMail({
      from,
      to: recipient,

      subject:
        'اختبار بريد Haymclub ✅',

      text:
        'تم ربط بريد Haymclub الحقيقي بنجاح.',

      html: `
        <div
          dir="rtl"
          style="
            max-width:600px;
            margin:auto;
            padding:30px;
            font-family:Arial,sans-serif;
            line-height:1.8;
          "
        >
          <h2>
            تم ربط بريد Haymclub بنجاح ✅
          </h2>

          <p>
            أصبح النظام جاهزًا لإرسال
            روابط استعادة كلمة المرور.
          </p>
        </div>
      `,
    });

  console.log(
    '✅ تم إرسال رسالة الاختبار',
  );

  console.log(
    `Message ID: ${result.messageId}`,
  );
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل اختبار البريد:',
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
