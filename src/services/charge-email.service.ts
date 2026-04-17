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

function formatDate(date?: Date | string | null) {
  if (!date) return "Não informado";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Não informado";

  return parsed.toLocaleDateString("pt-BR");
}

export async function sendChargeEmail(params: {
  to: string;
  clientName?: string | null;
  lawyerName?: string | null;
  lawyerEmail?: string | null;
  lawyerPhone?: string | null;
  amount: string;
  dueDate?: Date | string | null;
  paymentUrl: string;
}) {
  const transporter = getTransport();

  const subject = "Sua cobrança foi gerada";

  const clientName = params.clientName || "cliente";
  const lawyerName = params.lawyerName || "Seu advogado";
  const lawyerEmail = params.lawyerEmail || "Não informado";
  const lawyerPhone = params.lawyerPhone || "Não informado";
  const dueDate = formatDate(params.dueDate);

  const bodyText = [
    `Olá, ${clientName}`,
    "",
    `${lawyerName} gerou uma cobrança para você no valor de ${params.amount}, com vencimento em ${dueDate}.`,
    "",
    "Para efetuar o pagamento e visualizar mais informações da cobrança, clique no link:",
    params.paymentUrl,
    "",
    "Se você não reconhece essa cobrança, ou tem alguma dúvida sobre o pagamento, entre em contato com o seu fornecedor:",
    `Telefone: ${lawyerPhone}`,
    `Email: ${lawyerEmail}`,
    "",
    "Caso você já tenha efetuado o pagamento nas últimas 48 horas, favor desconsiderar esta mensagem.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#111827">
      <p>Olá, ${clientName}</p>

      <p>
        <strong>${lawyerName}</strong> gerou uma cobrança para você no valor de
        <strong> ${params.amount}</strong>, com vencimento em
        <strong> ${dueDate}</strong>.
      </p>

      <p>Para efetuar o pagamento e visualizar mais informações da cobrança, clique no link:</p>

      <p>
        <a href="${params.paymentUrl}" style="display:inline-block;padding:12px 18px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
          Abrir cobrança
        </a>
      </p>

      <p style="word-break:break-all">${params.paymentUrl}</p>

      <p>Se você não reconhece essa cobrança, ou tem alguma dúvida sobre o pagamento, entre em contato com o seu fornecedor:</p>

      <p>
        <strong>Telefone:</strong> ${lawyerPhone}<br />
        <strong>Email:</strong> ${lawyerEmail}
      </p>

      <p>Caso você já tenha efetuado o pagamento nas últimas 48 horas, favor desconsiderar esta mensagem.</p>
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