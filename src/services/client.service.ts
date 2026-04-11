import { prisma } from "@/lib/prisma";

type ClientPayload = {
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  accessCode?: string | null;
};

function normalizeDocument(value: string) {
  return value.replace(/\D/g, "");
}

function generateAccessCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function listActiveClientsByFirm(firmId: string) {
  return prisma.client.findMany({
    where: {
      firmId,
      archived: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function listArchivedClientsByFirm(firmId: string) {
  return prisma.client.findMany({
    where: {
      firmId,
      archived: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function findClientByIdAndFirm(id: string, firmId: string) {
  return prisma.client.findFirst({
    where: {
      id,
      firmId,
    },
  });
}

export async function findClientByDocumentInFirm(document: string, firmId: string) {
  const normalized = normalizeDocument(document);

  return prisma.client.findFirst({
    where: {
      firmId,
      document: normalized,
    },
  });
}

export async function createClientForFirm(data: ClientPayload, firmId: string) {
  const normalizedDocument = normalizeDocument(data.document);

  const existing = await prisma.client.findFirst({
    where: {
      firmId,
      document: normalizedDocument,
    },
  });

  if (existing) {
    throw new Error("Já existe um cliente com este documento nesta advocacia.");
  }

  return prisma.client.create({
    data: {
      name: data.name,
      document: normalizedDocument,
      email: data.email ?? null,
      phone: data.phone ?? null,
      accessCode: data.accessCode?.trim() || generateAccessCode(),
      firmId,
    },
  });
}

export async function updateClientForFirm(
  id: string,
  firmId: string,
  data: Partial<ClientPayload>
) {
  const existing = await prisma.client.findFirst({
    where: {
      id,
      firmId,
    },
  });

  if (!existing) {
    throw new Error("Cliente não encontrado.");
  }

  let normalizedDocument = existing.document;

  if (typeof data.document === "string" && data.document.trim()) {
    normalizedDocument = normalizeDocument(data.document);

    const duplicate = await prisma.client.findFirst({
      where: {
        firmId,
        document: normalizedDocument,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      throw new Error("Já existe outro cliente com este documento nesta advocacia.");
    }
  }

  return prisma.client.update({
    where: {
      id,
    },
    data: {
      name: typeof data.name === "string" ? data.name : existing.name,
      document: normalizedDocument,
      email: data.email !== undefined ? data.email : existing.email,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      accessCode:
  typeof data.accessCode === "string" && data.accessCode.trim()
    ? data.accessCode.trim()
    : existing.accessCode,
    },
  });
}

export async function archiveClientForFirm(id: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id,
      firmId,
    },
  });

  if (!client) {
    throw new Error("Cliente não encontrado.");
  }

  return prisma.client.update({
    where: {
      id,
    },
    data: {
      archived: true,
    },
  });
}

export async function unarchiveClientForFirm(id: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id,
      firmId,
    },
  });

  if (!client) {
    throw new Error("Cliente não encontrado.");
  }

  return prisma.client.update({
    where: {
      id,
    },
    data: {
      archived: false,
    },
  });
}

export async function deleteClientForFirm(id: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id,
      firmId,
    },
  });

  if (!client) {
    throw new Error("Cliente não encontrado.");
  }

  return prisma.client.delete({
    where: {
      id,
    },
  });
}