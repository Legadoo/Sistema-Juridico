import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin/guards";
import { listAllFirmsForSuperadmin } from "@/lib/superadmin/queries";

export async function GET() {
  try {
    await requireSuperadmin();

    const firms = await listAllFirmsForSuperadmin();

    return NextResponse.json({
      ok: true,
      firms,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json({ ok: false, message: "Apenas SUPERADMIN pode acessar esta área." }, { status: 403 });
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar as advocacias." },
      { status: 500 }
    );
  }
}