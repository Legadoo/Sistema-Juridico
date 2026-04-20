import nodemailer from "nodemailer";

type AppointmentEmailInput = {
  recipients: string[];
  firmName: string;
  clientName: string;
  scheduledAt: Date;
  durationMinutes: number;
  createdByName: string;
  notes?: string | null;
};

type AppointmentCancelledEmailInput = {
  recipients: string[];
  firmName: string;
  clientName: string;
  scheduledAt: Date;
  cancelledByName: string;
  cancelReason: string;
};

type VerificationEmailInput = {
  to: string;
  name: string;
  token: string;
};

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      })
    );
  }

  return transporterPromise;
}

function formatDate(dt: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(dt);
}

function getBaseUrl() {
  return process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
}

export async function sendAppointmentNotificationToFirmMasters(
  input: AppointmentEmailInput
) {
  const recipients = input.recipients.filter(Boolean);

  if (recipients.length === 0) {
    return { ok: true, skipped: true };
  }

  const transporter = await getTransporter();

  const subject = "Novo agendamento criado — JuridicVas";
  const text = [
    `Advocacia: ${input.firmName}`,
    `Cliente: ${input.clientName}`,
    `Data/Hora: ${formatDate(input.scheduledAt)}`,
    `Duração: ${input.durationMinutes} minuto(s)`,
    `Criado por: ${input.createdByName}`,
    input.notes ? `Observações: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "JuridicVas <no-reply@localhost>",
    to: recipients.join(", "),
    subject,
    text,
  });

  return { ok: true };
}

export async function sendAppointmentCancelledNotification(
  input: AppointmentCancelledEmailInput
) {
  const recipients = input.recipients.filter(Boolean);

  if (recipients.length === 0) {
    return { ok: true, skipped: true };
  }

  const transporter = await getTransporter();

  const subject = "Agendamento cancelado — JuridicVas";
  const text = [
    `Advocacia: ${input.firmName}`,
    `Cliente: ${input.clientName}`,
    `Data/Hora do agendamento: ${formatDate(input.scheduledAt)}`,
    `Cancelado por: ${input.cancelledByName}`,
    `Motivo do cancelamento: ${input.cancelReason}`,
  ].join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "JuridicVas <no-reply@localhost>",
    to: recipients.join(", "),
    subject,
    text,
  });

  return { ok: true };
}

export async function sendVerificationEmail(input: VerificationEmailInput) {
  const transporter = await getTransporter();
  const verifyUrl = `${getBaseUrl()}/api/public/verify-email?token=${encodeURIComponent(input.token)}`;

  const subject = "Confirme seu e-mail no JuridicVas";
  const text = [
    `Olá, ${input.name}.`,
    "",
    "Seu cadastro foi criado com sucesso no JuridicVas.",
    "Para ativar sua conta, confirme seu e-mail no link abaixo:",
    verifyUrl,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#0f172a; padding:24px; color:#e2e8f0;">
      <div style="max-width:640px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:28px;">
        <div style="font-size:12px; letter-spacing:0.12em; font-weight:700; color:#93c5fd; margin-bottom:12px;">
          JURIDICVAS · CONFIRMAÇÃO DE E-MAIL
        </div>
        <h1 style="margin:0 0 14px; font-size:28px; color:#f8fafc;">
          Confirme seu e-mail
        </h1>
        <p style="margin:0 0 16px; line-height:1.8; color:#94a3b8;">
          Olá, ${input.name}. Seu cadastro foi criado com sucesso no JuridicVas.
          Para ativar sua conta, confirme seu e-mail clicando no botão abaixo.
        </p>
        <div style="margin:24px 0;">
          <a href="${verifyUrl}" style="display:inline-block; padding:14px 18px; border-radius:14px; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:700;">
            Confirmar e-mail
          </a>
        </div>
        <p style="margin:0; line-height:1.8; color:#64748b; font-size:13px;">
          Se o botão não funcionar, use este link:<br />
          <span style="word-break:break-all;">${verifyUrl}</span>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "JuridicVas <no-reply@localhost>",
    to: input.to,
    subject,
    text,
    html,
  });

  return { ok: true };
}