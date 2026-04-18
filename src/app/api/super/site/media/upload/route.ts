import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSessionUser } from "@/lib/session";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function extFromName(name: string) {
  const ext = path.extname(name || "").toLowerCase();
  return ext || "";
}

function sanitizeBaseName(name: string) {
  return name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "arquivo";
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode enviar mídias do site público." },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Arquivo não enviado." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Formato de arquivo não permitido." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: "Arquivo excede o limite de 50MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name || "arquivo";
    const ext = extFromName(originalName);
    const safeName = sanitizeBaseName(originalName);
    const hash = crypto.randomBytes(8).toString("hex");
    const finalName = `${Date.now()}-${safeName}-${hash}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "site-media");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, finalName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/site-media/${finalName}`;

    return NextResponse.json({
      ok: true,
      message: "Arquivo enviado com sucesso.",
      data: {
        url: publicUrl,
        name: finalName,
        originalName,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível enviar o arquivo." },
      { status: 500 }
    );
  }
}