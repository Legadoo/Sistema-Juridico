import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getSessionUser } from "@/lib/session";

function isAllowedPublicUpload(url: string) {
  return typeof url === "string" && url.startsWith("/uploads/site-media/");
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode remover arquivos do site público." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const fileUrl = body?.fileUrl;

  if (!isAllowedPublicUpload(fileUrl)) {
    return NextResponse.json(
      { ok: false, message: "Arquivo inválido para exclusão." },
      { status: 400 }
    );
  }

  try {
    const relativePath = fileUrl.replace(/^\/+/, "");
    const absolutePath = path.join(process.cwd(), "public", relativePath.replace(/^uploads[\/\\]/, "uploads/"));

    await unlink(absolutePath);

    return NextResponse.json({
      ok: true,
      message: "Arquivo removido com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível remover o arquivo físico." },
      { status: 400 }
    );
  }
}