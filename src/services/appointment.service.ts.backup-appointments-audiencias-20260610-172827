import { prisma } from "@/lib/prisma";
import {
  sendAppointmentNotificationToFirmMasters,
  sendAppointmentCancelledNotification,
} from "./email.service";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  firmId: string | null;
};

type CreateAppointmentInput = {
  clientId: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
};

function isAllowedRole(role: string) {
  return role === "MASTER" || role === "SECRETARY";
}

export async function listAppointmentsForFirm(user: SessionUser) {
  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  return prisma.appointment.findMany({
    where: { firmId: user.firmId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    include: {
      client: {
        select: {
          id: true,
          name: true,
          document: true,
          phone: true,
          email: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      availabilitySlot: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
        },
      },
    },
  });
}

export async function createAppointmentForFirm(
  user: SessionUser,
  input: CreateAppointmentInput
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para criar agendamentos.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const clientId = (input.clientId || "").trim();
  const scheduledAt = new Date(input.scheduledAt);
  const durationMinutes = Number(input.durationMinutes || 60);
  const notes = (input.notes || "").trim();

  if (!clientId) {
    throw new Error("Selecione o cliente.");
  }

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data/hora inválida.");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
    throw new Error("Duração inválida.");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      firmId: user.firmId,
      archived: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!client) {
    throw new Error("Cliente não encontrado nesta advocacia.");
  }

  const firm = await prisma.lawFirm.findUnique({
    where: { id: user.firmId },
    select: { id: true, name: true },
  });

  if (!firm) {
    throw new Error("Advocacia não encontrada.");
  }

  const conflito = await prisma.appointment.findFirst({
    where: {
      firmId: user.firmId,
      scheduledAt,
      status: {
        not: "CANCELADO",
      },
    },
    select: {
      id: true,
    },
  });

  if (conflito) {
    throw new Error("Já existe um agendamento neste horário.");
  }

  const appointment = await prisma.appointment.create({
    data: {
      firmId: user.firmId,
      clientId: client.id,
      createdByUserId: user.id,
      scheduledAt,
      durationMinutes,
      notes: notes || null,
      source: "INTERNO",
      status: "AGENDADO",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          document: true,
          phone: true,
          email: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const masters = await prisma.user.findMany({
    where: {
      firmId: user.firmId,
      role: "MASTER",
      active: true,
      email: { not: "" },
    },
    select: {
      email: true,
    },
  });

  try {
    await sendAppointmentNotificationToFirmMasters({
      recipients: masters.map((m) => m.email).filter(Boolean),
      firmName: firm.name,
      clientName: client.name,
      scheduledAt,
      durationMinutes,
      createdByName: user.name,
      notes: notes || null,
    });
  } catch (error) {
    console.error("Falha ao enviar e-mail de agendamento:", error);
  }

  return appointment;
}

export async function updateAppointmentStatusForFirm(
  user: SessionUser,
  appointmentId: string,
  status: string,
  reason?: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para alterar agendamentos.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const allowedStatuses = ["CONFIRMADO", "CANCELADO", "CONCLUIDO"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Status inválido.");
  }

  const cancelReason = (reason || "").trim();

  if (status === "CANCELADO" && !cancelReason) {
    throw new Error("Informe o motivo do cancelamento.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      firmId: user.firmId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          document: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new Error("Agendamento não encontrado.");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      notes: status === "CANCELADO" ? cancelReason : appointment.notes,
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

  if (status === "CANCELADO") {
    const firm = await prisma.lawFirm.findUnique({
      where: { id: user.firmId },
      select: { name: true },
    });

    const masters = await prisma.user.findMany({
      where: {
        firmId: user.firmId,
        role: "MASTER",
        active: true,
        email: { not: "" },
      },
      select: {
        email: true,
      },
    });

    try {
      await sendAppointmentCancelledNotification({
        recipients: masters.map((m) => m.email).filter(Boolean),
        firmName: firm?.name || "Advocacia",
        clientName: appointment.client.name,
        scheduledAt: appointment.scheduledAt,
        cancelledByName: user.name,
        cancelReason,
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de cancelamento:", error);
    }
  }

  return updated;
}

export async function deleteFinishedAppointmentForFirm(
  user: SessionUser,
  appointmentId: string
) {
  if (!isAllowedRole(user.role)) {
    throw new Error("Sem permissão para excluir agendamentos.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      firmId: user.firmId,
    },
    select: {
      id: true,
      status: true,
      availabilitySlotId: true,
    },
  });

  if (!appointment) {
    throw new Error("Agendamento não encontrado.");
  }

  if (!["CANCELADO", "CONCLUIDO"].includes(appointment.status)) {
    throw new Error("Só é possível excluir agendamentos cancelados ou concluídos.");
  }

  await prisma.$transaction(async (tx) => {
    if (appointment.availabilitySlotId) {
      await tx.availabilitySlot.update({
        where: { id: appointment.availabilitySlotId },
        data: {
          isBooked: false,
          bookedAt: null,
          appointment: {
            disconnect: true,
          },
        },
      });
    }

    await tx.appointment.delete({
      where: { id: appointment.id },
    });
  });

  return { ok: true };
}