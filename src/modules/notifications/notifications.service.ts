import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { TypedConfigService } from '../../config/typed-config.service';
import {
  resetPasswordHtml,
  resetPasswordText,
  type ResetPasswordArgs,
} from './templates/reset-password.template';
import {
  verifyEmailHtml,
  verifyEmailText,
  type VerifyEmailArgs,
} from './templates/verify-email.template';

export interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;
  private from = '';

  constructor(private readonly config: TypedConfigService) {}

  onModuleInit(): void {
    this.from = this.config.get('SMTP_FROM');
    const host = this.config.get('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        'SMTP_HOST is not set — emails will be logged to stdout only (dev mode). Set SMTP_* env vars for real delivery.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_PORT') === 465,
      auth: this.config.get('SMTP_USER')
        ? {
            user: this.config.get('SMTP_USER'),
            pass: this.config.get('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  async send(args: SendEmailArgs): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[dev-email] to=${args.to}  subject="${args.subject}"\n${args.text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
  }

  async sendVerifyEmail(to: string, args: VerifyEmailArgs): Promise<void> {
    await this.send({
      to,
      subject: `Verify your ${args.brandName} email`,
      text: verifyEmailText(args),
      html: verifyEmailHtml(args),
    });
  }

  async sendResetPassword(to: string, args: ResetPasswordArgs): Promise<void> {
    await this.send({
      to,
      subject: `Reset your ${args.brandName} password`,
      text: resetPasswordText(args),
      html: resetPasswordHtml(args),
    });
  }
}
