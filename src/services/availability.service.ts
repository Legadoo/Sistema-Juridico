import { prisma } from "@/lib/prisma";
import { sendAppointmentNotificationToFirmMasters } from "./email.service";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  firmId: string | null;
};

type CreateAvailabilityWindowInput = {
  date: string;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  notes?: string;
};

type PublicBookingInput = {
  clientId: string;
  slotId: string;
  notes?: string;
};

function isAllowedRole(role: string) {
  return role === "MASTER" || role === "SECRETARY";
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const base = new Date(date);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

export async function listAvailabilityWindowsForFirm(user: SessionUser) {
  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  return prisma.availabilityWindow.findMany({
    where: { firmId: user.firmId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      slots: {
        orderBy: { startAt: "asc" },
      },
    },
  });
}

export async function createAvailabilityWindowForFirm(
  user: SessionUser,
  input: CreateAvailabilityWindowInput
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para abrir agenda.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const date = parseDateOnly(input.date);
  const startTime = (input.startTime || "").trim();
  const endTime = (input.endTime || "").trim();
  const slotIntervalMinutes = Number(input.slotIntervalMinutes);
  const notes = (input.notes || "").trim();

  if (!date) {
    throw new Error("Data inválida.");
  }

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("Horários inválidos.");
  }

  if (!Number.isFinite(slotIntervalMinutes) || slotIntervalMinutes < 5 || slotIntervalMinutes > 240) {
    throw new Error("Intervalo inválido.");
  }

  const startAt = combineDateAndTime(date, startTime);
  const endAt = combineDateAndTime(date, endTime);

  if (endAt <= startAt) {
    throw new Error("O horário final deve ser maior que o inicial.");
  }

  const window = await prisma.availabilityWindow.create({
    data: {
      firmId: user.firmId,
      createdByUserId: user.id,
      date,
      startTime,
      endTime,
      slotIntervalMinutes,
      notes: notes || null,
    },
  });

  const slots = [];
  let cursor = new Date(startAt);

  while (cursor < endAt) {
    const next = new Date(cursor.getTime() + slotIntervalMinutes * 60000);

    if (next <= endAt) {
      slots.push({
        firmId: user.firmId,
        windowId: window.id,
        startAt: new Date(cursor),
        endAt: new Date(next),
        isActive: true,
      });
    }

    cursor = next;
  }

  if (slots.length === 0) {
    await prisma.availabilityWindow.delete({ where: { id: window.id } });
    throw new Error("Não foi possível gerar horários com os dados informados.");
  }

  await prisma.availabilitySlot.createMany({
    data: slots,
  });

  return prisma.availabilityWindow.findUnique({
    where: { id: window.id },
    include: {
      slots: {
        orderBy: { startAt: "asc" },
      },
    },
  });
}

export async function cancelAvailabilityWindowForFirm(
  user: SessionUser,
  windowId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para cancelar abertura.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const window = await prisma.availabilityWindow.findFirst({
    where: {
      id: windowId,
      firmId: user.firmId,
    },
    select: {
      id: true,
    },
  });

  if (!window) {
    throw new Error("Abertura de agenda não encontrada.");
  }

  return prisma.availabilityWindow.update({
    where: { id: windowId },
    data: { isActive: false },
  });
}

export async function reactivateAvailabilityWindowForFirm(
  user: SessionUser,
  windowId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para reativar abertura.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const window = await prisma.availabilityWindow.findFirst({
    where: {
      id: windowId,
      firmId: user.firmId,
    },
    select: {
      id: true,
    },
  });

  if (!window) {
    throw new Error("Abertura de agenda não encontrada.");
  }

  return prisma.availabilityWindow.update({
    where: { id: windowId },
    data: { isActive: true },
  });
}

export async function deleteAvailabilityWindowForFirm(
  user: SessionUser,
  windowId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para excluir abertura.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const window = await prisma.availabilityWindow.findFirst({
    where: {
      id: windowId,
      firmId: user.firmId,
    },
    include: {
      slots: {
        select: {
          id: true,
          isBooked: true,
        },
      },
    },
  });

  if (!window) {
    throw new Error("Abertura de agenda não encontrada.");
  }

  const possuiReserva = window.slots.some((slot) => slot.isBooked);

  if (possuiReserva) {
    throw new Error("Não é possível excluir uma abertura que já possui horários reservados. Cancele a abertura.");
  }

  await prisma.availabilityWindow.delete({
    where: { id: windowId },
  });

  return { ok: true };
}

export async function deactivateAvailabilitySlotForFirm(
  user: SessionUser,
  slotId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para desativar horário.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      firmId: user.firmId,
    },
    select: {
      id: true,
      isBooked: true,
    },
  });

  if (!slot) {
    throw new Error("Horário não encontrado.");
  }

  if (slot.isBooked) {
    throw new Error("Não é possível desativar um horário já reservado.");
  }

  return prisma.availabilitySlot.update({
    where: { id: slotId },
    data: { isActive: false },
  });
}

export async function reactivateAvailabilitySlotForFirm(
  user: SessionUser,
  slotId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para reativar horário.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      firmId: user.firmId,
    },
    select: {
      id: true,
    },
  });

  if (!slot) {
    throw new Error("Horário não encontrado.");
  }

  return prisma.availabilitySlot.update({
    where: { id: slotId },
    data: { isActive: true },
  });
}

export async function deleteAvailabilitySlotForFirm(
  user: SessionUser,
  slotId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para excluir horário.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      firmId: user.firmId,
    },
    select: {
      id: true,
      isBooked: true,
    },
  });

  if (!slot) {
    throw new Error("Horário não encontrado.");
  }

  if (slot.isBooked) {
    throw new Error("Não é possível excluir um horário já reservado.");
  }

  await prisma.availabilitySlot.delete({
    where: { id: slotId },
  });

  return { ok: true };
}

export async function listPublicAvailableSlots(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firmId: true,
      archived: true,
      name: true,
    },
  });

  if (!client || client.archived) {
    throw new Error("Cliente inválido.");
  }

  const now = new Date();

  return prisma.availabilitySlot.findMany({
    where: {
      firmId: client.firmId,
      isBooked: false,
      isActive: true,
      startAt: {
        gte: now,
      },
      window: {
        isActive: true,
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      window: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          slotIntervalMinutes: true,
          isActive: true,
        },
      },
    },
  });
}

export async function createPublicAppointmentFromSlot(
  clientId: string,
  input: PublicBookingInput
) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      firmId: true,
      archived: true,
    },
  });

  if (!client || client.archived) {
    throw new Error("Cliente inválido.");
  }

  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: input.slotId,
      firmId: client.firmId,
    },
    include: {
      window: {
        include: {
          firm: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!slot) {
    throw new Error("Horário não encontrado.");
  }

  if (!slot.window.isActive) {
    throw new Error("Esta abertura de agenda não está ativa.");
  }

  if (!slot.isActive) {
    throw new Error("Este horário está indisponível.");
  }

  if (slot.isBooked) {
    throw new Error("Este horário já foi reservado.");
  }

  if (slot.startAt < new Date()) {
    throw new Error("Este horário já passou.");
  }

  const masters = await prisma.user.findMany({
    where: {
      firmId: client.firmId,
      role: "MASTER",
      active: true,
      email: { not: "" },
    },
    select: {
      email: true,
    },
  });

  const createdByUserId =
    (await prisma.user.findFirst({
      where: {
        firmId: client.firmId,
        role: "MASTER",
        active: true,
      },
      select: { id: true },
    }))?.id;

  if (!createdByUserId) {
    throw new Error("Nenhum advogado master ativo encontrado para esta advocacia.");
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const freshSlot = await tx.availabilitySlot.findUnique({
      where: { id: slot.id },
      include: { appointment: true, window: true },
    });

    if (!freshSlot || freshSlot.isBooked || freshSlot.appointment) {
      throw new Error("Este horário acabou de ser reservado por outra pessoa.");
    }

    if (!freshSlot.isActive || !freshSlot.window.isActive) {
      throw new Error("Este horário não está mais disponível.");
    }

    const appointmentCreated = await tx.appointment.create({
      data: {
        firmId: client.firmId,
        clientId: client.id,
        createdByUserId,
        availabilitySlotId: freshSlot.id,
        scheduledAt: freshSlot.startAt,
        durationMinutes: Math.max(
          1,
          Math.round((freshSlot.endAt.getTime() - freshSlot.startAt.getTime()) / 60000)
        ),
        notes: (input.notes || "").trim() || null,
        source: "PUBLICO",
        status: "AGENDADO",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            document: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await tx.availabilitySlot.update({
      where: { id: freshSlot.id },
      data: {
        isBooked: true,
        bookedAt: new Date(),
        appointment: {
          connect: { id: appointmentCreated.id },
        },
      },
    });

    return appointmentCreated;
  });

  try {
    await sendAppointmentNotificationToFirmMasters({
      recipients: masters.map((m) => m.email).filter(Boolean),
      firmName: slot.window.firm.name,
      clientName: client.name,
      scheduledAt: slot.startAt,
      durationMinutes: Math.max(
        1,
        Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60000)
      ),
      createdByName: "Agendamento público",
      notes: (input.notes || "").trim() || null,
    });
  } catch (error) {
    console.error("Falha ao enviar e-mail do agendamento público:", error);
  }

  return appointment;
}