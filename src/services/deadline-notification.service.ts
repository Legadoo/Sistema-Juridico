import { prisma } from "@/lib/prisma";
import { sendDeadlineNotificationToFirmUsers } from "./email.service";

type DeadlineWithProcess = {
  title?: string | null;
  description?: string | null;
  dueDate: Date;
  process?: {
    cnj?: string | null;
    tribunal?: string | null;
    vara?: string | null;
    client?: {
      name?: string | null;
    } | null;
  } | null;
};

export async function notifyDeadlineToFirmUsers(params: {
  firmId: string;
  action: "criado" | "atualizado";
  deadline: DeadlineWithProcess;
  createdByName: string;
}) {
  const [firm, users] = await Promise.all([
    prisma.lawFirm.findUnique({
      where: {
        id: params.firmId,
      },
      select: {
        name: true,
      },
    }),
    prisma.user.findMany({
      where: {
        firmId: params.firmId,
        active: true,
        email: {
          not: "",
        },
      },
      select: {
        email: true,
      },
    }),
  ]);

  const recipients = users.map((user) => user.email).filter(Boolean);

  if (recipients.length === 0) {
    return { ok: true, skipped: true };
  }

  return sendDeadlineNotificationToFirmUsers({
    recipients,
    firmName: firm?.name || "Advocacia",
    action: params.action,
    title: params.deadline.title || "Prazo",
    dueDate: params.deadline.dueDate,
    createdByName: params.createdByName,
    description: params.deadline.description || null,
    clientName: params.deadline.process?.client?.name || null,
    processNumber: params.deadline.process?.cnj || null,
    tribunal: params.deadline.process?.tribunal || null,
    vara: params.deadline.process?.vara || null,
  });
}