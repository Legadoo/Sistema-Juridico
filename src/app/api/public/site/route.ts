import { NextResponse } from "next/server";
import { getPublicSiteData } from "@/services/public-site/site";

export async function GET() {
  try {
    const data = await getPublicSiteData();

    if (!data.config.isPublished) {
      return NextResponse.json(
        { ok: false, message: "Landing pública indisponível no momento." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar os dados do site público." },
      { status: 500 }
    );
  }
}