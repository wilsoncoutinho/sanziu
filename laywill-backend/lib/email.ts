type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  return Boolean(apiKey && from);
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY or EMAIL_FROM not set");
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${res.status} ${text}`);
  }
}

export function verificationEmailTemplate(code: string) {
  return {
    subject: "Laywill — Seu código de verificação",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6">
        <h2>Confirme seu email no Laywill</h2>
        <p>Olá! Use este código para confirmar sua conta e começar a organizar as finanças do casal:</p>
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px">${code}</div>
        <p>Esse código expira em 10 minutos.</p>
        <p style="color: #666">Se você não solicitou este cadastro, ignore este email.</p>
      </div>
    `,
  };
}

export function resetPasswordEmailTemplate(resetLink: string) {
  return {
    subject: "Laywill — Redefinir sua senha",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6">
        <h2>Redefinição de senha no Laywill</h2>
        <p>Para criar uma nova senha, clique no link abaixo:</p>
        <p><a href="${resetLink}">Redefinir senha</a></p>
        <p>Esse link expira em 1 hora.</p>
        <p style="color: #666">Se você não solicitou isso, ignore este email.</p>
      </div>
    `,
  };
}
