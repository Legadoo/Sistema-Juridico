import { prisma } from "@/lib/prisma";

export async function getSuperadminDashboardStats() {
  const [
    firms,
    activeFirms,
    inactiveFirms,
    users,
    clients,
    activeClients,
    processes,
    activeProcesses,
  ] = await Promise.all([
    prisma.lawFirm.count(),
    prisma.lawFirm.count({ where: { active: true } }),
    prisma.lawFirm.count({ where: { active: false } }),
    prisma.user.count(),
    prisma.client.count(),
    prisma.client.count({ where: { archived: false } }),
    prisma.legalProcess.count(),
    prisma.legalProcess.count({ where: { archived: false } }),
  ]);

  return {
    firms,
    activeFirms,
    inactiveFirms,
    users,
    clients,
    activeClients,
    processes,
    activeProcesses,
  };
}

export async function listAllFirmsForSuperadmin() {
  const firms = await prisma.lawFirm.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      config: true,
      _count: {
        select: {
          users: true,
          clients: true,
          processes: true,
        },
      },
    },
  });

  return firms.map((firm) => {
    const maxClients = firm.config?.maxClients ?? 50;
    const clientsCount = firm._count.clients;
    const usagePercent = maxClients > 0 ? Math.min(100, Math.round((clientsCount / maxClients) * 100)) : 0;

    return {
      id: firm.id,
      name: firm.name,
      slug: firm.slug,
      active: firm.active,
      createdAt: firm.createdAt,
      updatedAt: firm.updatedAt,
      maxClients,
      usersCount: firm._count.users,
      clientsCount: clientsCount,
      processesCount: firm._count.processes,
      usagePercent,
      nearLimit: usagePercent >= 80,
    };
  });
}

export async function getSuperadminDashboardOverview() {
  const [stats, firms] = await Promise.all([
    getSuperadminDashboardStats(),
    listAllFirmsForSuperadmin(),
  ]);

  const sortedByLoad = [...firms].sort((a, b) => {
    if (b.usagePercent !== a.usagePercent) return b.usagePercent - a.usagePercent;
    if (b.clientsCount !== a.clientsCount) return b.clientsCount - a.clientsCount;
    return a.name.localeCompare(b.name);
  });

  return {
    stats,
    firms,
    topFirms: sortedByLoad.slice(0, 6),
    attentionFirms: sortedByLoad.filter((firm) => !firm.active || firm.nearLimit).slice(0, 6),
  };
}