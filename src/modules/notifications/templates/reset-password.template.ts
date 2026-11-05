export interface ResetPasswordArgs {
  brandName: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function resetPasswordText(args: ResetPasswordArgs): string {
  return [
    `Hi ${args.recipientName},`,
    '',
    `Someone asked to reset your ${args.brandName} password. If that was you, open this link:`,
    args.resetUrl,
    '',
    `The link expires in ${args.expiresInMinutes} minutes. If you didn't request this, ignore this email — your password is unchanged.`,
    '',
    `— The ${args.brandName} team`,
  ].join('\n');
}

export function resetPasswordHtml(args: ResetPasswordArgs): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#11131b;color:#e1e1ed;font-family:Inter,Arial,sans-serif;line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;padding:32px;background:#1d1f28;border-radius:16px;border:1px solid rgba(255,255,255,0.09);">
      <h1 style="font-size:22px;margin:0 0 16px;color:#e1e1ed;">Password reset</h1>
      <p style="margin:0 0 16px;">Hi ${escape(args.recipientName)},</p>
      <p style="margin:0 0 24px;">Someone asked to reset your ${escape(args.brandName)} password. If that was you, click the button below:</p>
      <p style="margin:0 0 24px;">
        <a href="${args.resetUrl}" style="display:inline-block;padding:12px 24px;background:#a078ff;color:#340080;text-decoration:none;border-radius:12px;font-weight:600;">Reset password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#cbc3d7;">Or paste this link:</p>
      <p style="margin:0 0 24px;font-size:12px;color:#958ea0;word-break:break-all;">${args.resetUrl}</p>
      <p style="margin:0;font-size:12px;color:#958ea0;">Link expires in ${args.expiresInMinutes} minutes. If you didn't request this, your password is unchanged.</p>
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
