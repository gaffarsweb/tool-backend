export interface VerifyEmailArgs {
  brandName: string;
  recipientName: string;
  verifyUrl: string;
  expiresInHours: number;
}

export function verifyEmailText(args: VerifyEmailArgs): string {
  return [
    `Hi ${args.recipientName},`,
    '',
    `Welcome to ${args.brandName}! Verify your email to activate your account:`,
    args.verifyUrl,
    '',
    `This link expires in ${args.expiresInHours} hours. If you didn't sign up, ignore this email.`,
    '',
    `— The ${args.brandName} team`,
  ].join('\n');
}

export function verifyEmailHtml(args: VerifyEmailArgs): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#11131b;color:#e1e1ed;font-family:Inter,Arial,sans-serif;line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;padding:32px;background:#1d1f28;border-radius:16px;border:1px solid rgba(255,255,255,0.09);">
      <h1 style="font-size:22px;margin:0 0 16px;color:#e1e1ed;">Welcome to ${escape(args.brandName)}</h1>
      <p style="margin:0 0 16px;">Hi ${escape(args.recipientName)},</p>
      <p style="margin:0 0 24px;">Verify your email to activate your account.</p>
      <p style="margin:0 0 24px;">
        <a href="${args.verifyUrl}" style="display:inline-block;padding:12px 24px;background:#a078ff;color:#340080;text-decoration:none;border-radius:12px;font-weight:600;">Verify email</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#cbc3d7;">Or paste this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:12px;color:#958ea0;word-break:break-all;">${args.verifyUrl}</p>
      <p style="margin:0;font-size:12px;color:#958ea0;">Link expires in ${args.expiresInHours} hours. If you didn't sign up, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
