import { prisma } from "@/lib/prisma";

type CreateProcessPayload = {
  cnj: string;
  clientId: string;
  notes?: string | null;
  tribunal?: string | null;
  vara?: string | null;
  status?: string | null;
  startDate?: string | null;
};

export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export async function listProcessesByFirm(
  firmId: string,
  options?: { archived?: boolean; clientId?: string }
) {
  const archived = options?.archived ?? false;
  const clientId = options?.clientId?.trim() || "";

  return prisma.legalProcess.findMany({
    where: {
      firmId,
      archived,
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: true,
      updates: {
        orderBy: { date: "desc" },
        take: 1,
      },
      deadlines: {
        orderBy: { dueDate: "asc" },
        take: 3,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function ensureClientBelongsToFirm(clientId: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      firmId,
    },
  });

  if (!client) {
    throw new Error("Cliente inválido para esta advocacia.");
  }

  return client;
}

export async function ensureUniqueProcessCnjInFirm(cnj: string, firmId: string) {
  const normalizedCnj = onlyDigits(cnj);

  const existing = await prisma.legalProcess.findFirst({
    where: {
      firmId,
      cnj: normalizedCnj,
    },
  });

  if (existing) {
    throw new Error("Já existe um processo com este CNJ nesta advocacia.");
  }

  return normalizedCnj;
}

export async function createProcessForFirm(
  firmId: string,
  payload: CreateProcessPayload
) {
  const cnj = onlyDigits(payload.cnj);
  const clientId = (payload.clientId ?? "").toString().trim();
  const notes = (payload.notes ?? "").toString().trim();
  const tribunal = (payload.tribunal ?? "").toString().trim();
  const vara = (payload.vara ?? "").toString().trim();
  const status = (payload.status ?? "ACTIVE").toString().trim();
  const startDateRaw = (payload.startDate ?? "").toString().trim();

  if (!cnj || !clientId) {
    throw new Error("Preencha o CNJ e selecione o cliente.");
  }

  await ensureClientBelongsToFirm(clientId, firmId);
  await ensureUniqueProcessCnjInFirm(cnj, firmId);

  return prisma.legalProcess.create({
    data: {
      cnj,
      clientId,
      firmId,
      notes: notes || null,
      tribunal: tribunal || null,
      vara: vara || null,
      status: status || "ACTIVE",
      startDate: startDateRaw ? new Date(startDateRaw) : null,
    },
    include: {
      client: true,
    },
  });
}