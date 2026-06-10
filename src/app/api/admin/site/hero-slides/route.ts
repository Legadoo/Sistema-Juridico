import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
    { status: 403 }
  );
}

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeBoolean(value: unknown, fallback = true) {
  if (typeof value !== "boolean") return fallback;
  return value;
}

function isValidImageUrl(value: string) {
  if (!value) return false;

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function requireSuperadminUser() {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "SUPERADMIN") {
    return {
      ok: false as const,
      response: forbidden(),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function GET() {
  const auth = await requireSuperadminUser();

  if (!auth.ok) {
    return auth.response;
  }

  const slides = await prisma.landingMedia.findMany({
    where: {
      section: "hero",
      type: "image",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    slides,
  });
}

export async function POST(req: Request) {
  const auth = await requireSuperadminUser();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await req.json().catch(() => null);
  const rawSlides = Array.isArray(body?.slides) ? body.slides : [];

  const slides = rawSlides
    .map((item: Record<string, unknown>, index: number) => {
      const url = safeText(item.url);
      const title = safeText(item.title, `Slide ${index + 1}`) || `Slide ${index + 1}`;

      return {
        title,
        description: null,
        type: "image",
        url,
        alt: safeText(item.alt, title) || title,
        section: "hero",
        sortOrder: safeNumber(item.sortOrder, index),
        isActive: safeBoolean(item.isActive, true),
      };
    })
    .filter((item) => item.url && isValidImageUrl(item.url));

  if (rawSlides.length > 0 && slides.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Informe pelo menos uma URL de imagem válida." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.landingMedia.deleteMany({
      where: {
        section: "hero",
        type: "image",
      },
    });

    for (const slide of slides) {
      await tx.landingMedia.create({
        data: slide,
      });
    }
  });

  const savedSlides = await prisma.landingMedia.findMany({
    where: {
      section: "hero",
      type: "image",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    message: "Slides do hero salvos com sucesso.",
    slides: savedSlides,
  });
}