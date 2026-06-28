import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAO_PAULO_TIMEZONE_OFFSET = "-03:00";

function getSaoPauloDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível normalizar a data.");
  }

  return `${year}-${month}-${day}`;
}

function createSaoPauloDateTime(dateKey: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    `${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000${SAO_PAULO_TIMEZONE_OFFSET}`
  );
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

async function main() {
  const windows = await prisma.availabilityWindow.findMany({
    include: {
      slots: {
        orderBy: {
          startAt: "asc",
        },
      },
    },
  });

  console.log(`Aberturas encontradas: ${windows.length}`);

  let totalSlotsCorrigidos = 0;
  let totalAppointmentsCorrigidos = 0;

  for (const window of windows) {
    const dateKey = getSaoPauloDateKey(window.date);
    const interval = Number(window.slotIntervalMinutes);

    if (!Number.isFinite(interval) || interval <= 0) {
      console.log(`Pulando abertura ${window.id}: intervalo inválido.`);
      continue;
    }

    let cursor = createSaoPauloDateTime(dateKey, window.startTime);

    for (const slot of window.slots) {
      const expectedStart = new Date(cursor);
      const expectedEnd = addMinutes(expectedStart, interval);

      const needsSlotUpdate =
        slot.startAt.getTime() !== expectedStart.getTime() ||
        slot.endAt.getTime() !== expectedEnd.getTime();

      if (needsSlotUpdate) {
        await prisma.availabilitySlot.update({
          where: {
            id: slot.id,
          },
          data: {
            startAt: expectedStart,
            endAt: expectedEnd,
          },
        });

        totalSlotsCorrigidos++;
      }

      const durationMinutes = Math.max(
        1,
        Math.round((expectedEnd.getTime() - expectedStart.getTime()) / 60000)
      );

      const appointmentUpdate = await prisma.appointment.updateMany({
        where: {
          availabilitySlotId: slot.id,
        },
        data: {
          scheduledAt: expectedStart,
          durationMinutes,
        },
      });

      totalAppointmentsCorrigidos += appointmentUpdate.count;

      cursor = expectedEnd;
    }
  }

  console.log(`Slots corrigidos: ${totalSlotsCorrigidos}`);
  console.log(`Agendamentos vinculados corrigidos: ${totalAppointmentsCorrigidos}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });