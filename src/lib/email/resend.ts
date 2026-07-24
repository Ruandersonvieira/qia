import { Resend } from "resend";

export async function sendResetPasswordEmail(to: string, url: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "QIA <onboarding@resend.dev>",
    to,
    subject: "Redefinir sua senha — QIA",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #FFC940; background: #0E2A32; display: inline-block; padding: 8px 16px; border-radius: 8px;">qia.</p>
        <h1 style="font-size: 20px; color: #0E2A32;">Redefinir sua senha</h1>
        <p style="font-size: 14px; color: #46626B; line-height: 1.5;">
          Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. Se você não pediu isso, ignore este email.
        </p>
        <a href="${url}" style="display: inline-block; margin-top: 16px; background: #FFC940; color: #0E2A32; font-weight: 600; padding: 12px 24px; border-radius: 999px; text-decoration: none;">
          Redefinir senha
        </a>
        <p style="font-size: 12px; color: #46626B; margin-top: 24px;">Este link expira em 1 hora.</p>
      </div>
    `,
  });
}
