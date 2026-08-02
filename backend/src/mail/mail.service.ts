import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import * as nodemailer from 'nodemailer';

import type {
  Transporter,
} from 'nodemailer';

@Injectable()
export class MailService {
  private transporter:
    Transporter | null = null;

  constructor(
    private readonly configService:
      ConfigService,
  ) {}

  async verifyConnection():
  Promise<void> {
    const transporter =
      this.getTransporter();

    try {
      await transporter.verify();
    } catch {
      throw new ServiceUnavailableException(
        'تعذر الاتصال بخادم البريد الإلكتروني.',
      );
    }
  }

  async sendPasswordResetEmail(
    recipient: string,
    resetUrl: string,
    expiresMinutes: number,
  ): Promise<void> {
    const transporter =
      this.getTransporter();

    const from =
      this.getFromAddress();

    await transporter.sendMail({
      from,
      to: recipient,
      subject:
        'إعادة تعيين كلمة مرور Haymclub',

      text: [
        'مرحبًا،',
        '',
        'تم طلب إعادة تعيين كلمة مرور حسابك في Haymclub.',
        '',
        `افتح الرابط التالي لإنشاء كلمة مرور جديدة:`,
        resetUrl,
        '',
        `صلاحية الرابط: ${expiresMinutes} دقيقة.`,
        '',
        'إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة.',
      ].join('\n'),

      html: `
        <div
          dir="rtl"
          style="
            max-width:600px;
            margin:auto;
            padding:30px;
            font-family:Arial,sans-serif;
            color:#172033;
            line-height:1.8;
          "
        >
          <div
            style="
              width:56px;
              height:56px;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:0 auto 20px;
              border-radius:16px;
              background:#3865ef;
              color:#fff;
              font-size:27px;
              font-weight:bold;
            "
          >
            H
          </div>

          <h1 style="text-align:center;">
            إعادة تعيين كلمة المرور
          </h1>

          <p>
            تم طلب إعادة تعيين كلمة مرور
            حسابك في منصة Haymclub.
          </p>

          <p style="text-align:center;">
            <a
              href="${resetUrl}"
              style="
                display:inline-block;
                padding:14px 24px;
                border-radius:10px;
                background:#3865ef;
                color:#fff;
                text-decoration:none;
                font-weight:bold;
              "
            >
              إنشاء كلمة مرور جديدة
            </a>
          </p>

          <p>
            صلاحية الرابط:
            <strong>${expiresMinutes} دقيقة</strong>.
          </p>

          <p style="color:#71809e;">
            إذا لم تطلب تغيير كلمة المرور،
            تجاهل هذه الرسالة.
          </p>
        </div>
      `,
    });
  }

  async sendTemporaryPasswordEmail(
    recipient: string,
    temporaryPassword: string,
    loginUrl: string,
  ): Promise<void> {
    const transporter =
      this.getTransporter();

    await transporter.sendMail({
      from:
        this.getFromAddress(),

      to: recipient,

      subject:
        'بيانات دخول حساب Haymclub',

      text: [
        'تم إنشاء حسابك في Haymclub.',
        '',
        `البريد الإلكتروني: ${recipient}`,
        `كلمة المرور المؤقتة: ${temporaryPassword}`,
        '',
        `رابط تسجيل الدخول: ${loginUrl}`,
        '',
        'غيّر كلمة المرور بعد أول تسجيل دخول.',
      ].join('\n'),
    });
  }

  async sendTestEmail(
    recipient: string,
  ): Promise<void> {
    const transporter =
      this.getTransporter();

    await transporter.sendMail({
      from:
        this.getFromAddress(),

      to: recipient,

      subject:
        'اختبار بريد Haymclub ✅',

      text:
        'تم ربط بريد Haymclub الحقيقي بنجاح.',

      html: `
        <div
          dir="rtl"
          style="
            padding:30px;
            font-family:Arial,sans-serif;
          "
        >
          <h2>
            تم ربط بريد Haymclub بنجاح ✅
          </h2>

          <p>
            أصبح النظام قادرًا على إرسال
            رسائل استعادة كلمة المرور.
          </p>
        </div>
      `,
    });
  }

  private getTransporter():
  Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host =
      this.configService.get<string>(
        'SMTP_HOST',
      );

    const port =
      Number(
        this.configService.get<string>(
          'SMTP_PORT',
        ) ?? '465',
      );

    const secureValue =
      this.configService.get<string>(
        'SMTP_SECURE',
      );

    const user =
      this.configService.get<string>(
        'SMTP_USER',
      );

    const password =
      this.configService.get<string>(
        'SMTP_PASS',
      );

    if (
      !host ||
      !user ||
      !password ||
      Number.isNaN(port)
    ) {
      throw new ServiceUnavailableException(
        'بيانات SMTP غير مكتملة.',
      );
    }

    const secure =
      secureValue === 'true' ||
      port === 465;

    this.transporter =
      nodemailer.createTransport({
        host,
        port,
        secure,

        auth: {
          user,
          pass: password,
        },

        connectionTimeout:
          15_000,

        greetingTimeout:
          15_000,

        socketTimeout:
          30_000,
      });

    return this.transporter;
  }

  private getFromAddress():
  string {
    const configuredFrom =
      this.configService.get<string>(
        'SMTP_FROM',
      );

    const user =
      this.configService.get<string>(
        'SMTP_USER',
      );

    return (
      configuredFrom ||
      `Haymclub <${user}>`
    );
  }
}
