import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return Boolean(value);
}

function normalizeMaxClients(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.min(100000, Math.max(1, Math.floor(number)));
}

function normalizeModules(body: any) {
  return {
    moduleDashboard: normalizeBoolean(body?.moduleDashboard, true),
    moduleClients: normalizeBoolean(body?.moduleClients, true),
    moduleProcesses: normalizeBoolean(body?.moduleProcesses, true),
    moduleDeadlines: normalizeBoolean(body?.moduleDeadlines, true),
    moduleAppointments: normalizeBoolean(body?.moduleAppointments, true),
    moduleAvailability: normalizeBoolean(body?.moduleAvailability, true),
    moduleUsers: normalizeBoolean(body?.moduleUsers, true),
    moduleCharges: normalizeBoolean(body?.moduleCharges, true),
  };
}

export async function GET() {
  try {
    await requireSuperadmin();

    const firms = await prisma.lawFirm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        config: true,
        paymentGatewayConfig: true,
        _count: {
          select: {
            users: true,
            clients: true,
            processes: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      firms: firms.map((firm) => {
        const maxClients = firm.config?.maxClients ?? 50;
        const clientsCount = firm._count.clients;
        const usagePercent =
          maxClients > 0 ? Math.min(100, Math.round((clientsCount / maxClients) * 100)) : 0;

        return {
          id: firm.id,
          name: firm.name,
          slug: firm.slug,
          active: firm.active,
          createdAt: firm.createdAt,
          updatedAt: firm.updatedAt,

          maxClients,
          usersCount: firm._count.users,
          clientsCount,
          processesCount: firm._count.processes,
          usagePercent,
          nearLimit: usagePercent >= 80,

          moduleDashboard: firm.config?.moduleDashboard ?? true,
          moduleClients: firm.config?.moduleClients ?? true,
          moduleProcesses: firm.config?.moduleProcesses ?? true,
          moduleDeadlines: firm.config?.moduleDeadlines ?? true,
          moduleAppointments: firm.config?.moduleAppointments ?? true,
          moduleAvailability: firm.config?.moduleAvailability ?? true,
          moduleUsers: firm.config?.moduleUsers ?? true,
          moduleCharges: firm.config?.moduleCharges ?? true,

          gatewayConfigured: Boolean(firm.paymentGatewayConfig),
          gatewayActive: Boolean(firm.paymentGatewayConfig?.isActive),
          gatewayEnabledBySuperadmin: Boolean(firm.paymentGatewayConfig?.enabledBySuperadmin),
          gatewayProvider: firm.paymentGatewayConfig?.provider ?? "MERCADO_PAGO",
        };
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar as advocacias." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadmin();

    const body = await req.json().catch(() => null);

    const name = (body?.name ?? "").toString().trim();
    const slugRaw = (body?.slug ?? "").toString().trim();
    const active = normalizeBoolean(body?.active, true);
    const maxClients = normalizeMaxClients(body?.maxClients);
    const modules = normalizeModules(body);

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Nome da advocacia obrigatório." },
        { status: 400 }
      );
    }

    const slug = slugify(slugRaw || name);

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Slug inválido." },
        { status: 400 }
      );
    }

    const existingSlug = await prisma.lawFirm.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { ok: false, message: "Já existe uma advocacia com este slug." },
        { status: 409 }
      );
    }

    const firm = await prisma.lawFirm.create({
      data: {
        name,
        slug,
        active,
        config: {
          create: {
            maxClients,
            ...modules,
          },
        },
      },
      include: {
        config: true,
        paymentGatewayConfig: true,
        _count: {
          select: {
            users: true,
            clients: true,
            processes: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Advocacia criada com sucesso.",
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        active: firm.active,
        maxClients: firm.config?.maxClients ?? maxClients,
        usersCount: firm._count.users,
        clientsCount: firm._count.clients,
        processesCount: firm._count.processes,
        moduleDashboard: firm.config?.moduleDashboard ?? true,
        moduleClients: firm.config?.moduleClients ?? true,
        moduleProcesses: firm.config?.moduleProcesses ?? true,
        moduleDeadlines: firm.config?.moduleDeadlines ?? true,
        moduleAppointments: firm.config?.moduleAppointments ?? true,
        moduleAvailability: firm.config?.moduleAvailability ?? true,
        moduleUsers: firm.config?.moduleUsers ?? true,
        moduleCharges: firm.config?.moduleCharges ?? true,
        gatewayConfigured: false,
        gatewayActive: false,
        gatewayEnabledBySuperadmin: false,
        gatewayProvider: "MERCADO_PAGO",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível criar a advocacia." },
      { status: 500 }
    );
  }
}
