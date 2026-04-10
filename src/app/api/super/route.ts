import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/superadmin/guards";
import { getSuperadminDashboardOverview } from "@/lib/superadmin/queries";

export async function GET() {
  try {
    await requireSuperadmin();

    const overview = await getSuperadminDashboardOverview();

    return NextResponse.json({
      ok: true,
      ...overview,
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
      { ok: false, message: "Não foi possível carregar o dashboard global." },
      { status: 500 }
    );
  }
}