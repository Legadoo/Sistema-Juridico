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