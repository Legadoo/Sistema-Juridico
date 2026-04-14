import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    throw new Error("SMTP não configurado no .env.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "no-reply@juridicvas.local"
  );
}

export async function sendChargeEmail(params: {
  to: string;
  clientName?: string | null;
  amount: string;
  message?: string | null;
  paymentUrl: string;
}) {
  const transporter = getTransport();

  const subject = "Sua cobrança foi gerada";
  const greeting = params.clientName ? `Olá, ${params.clientName}.` : "Olá.";

  const bodyText = [
    greeting,
    "",
    `Sua cobrança no valor de ${params.amount} foi gerada.`,
    params.message ? params.message : null,
    "",
    "Link para pagamento:",
    params.paymentUrl,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>${greeting}</p>
      <p>Sua cobrança no valor de <strong>${params.amount}</strong> foi gerada.</p>
      ${params.message ? `<p>${params.message}</p>` : ""}
      <p>
        <a href="${params.paymentUrl}" style="display:inline-block;padding:12px 18px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
          Abrir cobrança
        </a>
      </p>
      <p>Ou copie o link abaixo:</p>
      <p style="word-break:break-all">${params.paymentUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to: params.to,
    subject,
    text: bodyText,
    html,
  });
}