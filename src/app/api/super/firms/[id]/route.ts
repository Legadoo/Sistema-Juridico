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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    await requireSuperadmin();

    const { id } = await context.params;

    const firm = await prisma.lawFirm.findUnique({
      where: { id },
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

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        active: firm.active,
        createdAt: firm.createdAt,
        updatedAt: firm.updatedAt,
        maxClients: firm.config?.maxClients ?? 50,
        usersCount: firm._count.users,
        clientsCount: firm._count.clients,
        processesCount: firm._count.processes,
      },
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
      { ok: false, message: "Não foi possível carregar a advocacia." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireSuperadmin();

    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const name = (body?.name ?? "").toString().trim();
    const slugRaw = (body?.slug ?? "").toString().trim();
    const active = Boolean(body?.active);
    const maxClients = Number(body?.maxClients);

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

    if (!Number.isFinite(maxClients) || maxClients < 1 || maxClients > 100000) {
      return NextResponse.json(
        { ok: false, message: "maxClients inválido." },
        { status: 400 }
      );
    }

    const firm = await prisma.lawFirm.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia não encontrada." },
        { status: 404 }
      );
    }

    const existingSlug = await prisma.lawFirm.findFirst({
      where: {
        slug,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { ok: false, message: "Já existe outra advocacia com este slug." },
        { status: 409 }
      );
    }

    const updatedFirm = await prisma.lawFirm.update({
      where: { id },
      data: {
        name,
        slug,
        active,
      },
    });

    const updatedConfig = await prisma.firmConfig.upsert({
      where: { firmId: id },
      update: { maxClients },
      create: {
        firmId: id,
        maxClients,
      },
    });

    return NextResponse.json({
      ok: true,
      firm: {
        id: updatedFirm.id,
        name: updatedFirm.name,
        slug: updatedFirm.slug,
        active: updatedFirm.active,
        maxClients: updatedConfig.maxClients,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode alterar esta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível salvar a advocacia." },
      { status: 500 }
    );
  }
}
