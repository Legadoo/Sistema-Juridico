import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    if (!["MASTER", "SECRETARY"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }

    if (!user.firmId) {
      return NextResponse.json({ ok: false, message: "Firma não encontrada." }, { status: 400 });
    }

    const format = request.nextUrl.searchParams.get("format") || "csv";

    const appointments = await prisma.appointment.findMany({
      where: {
        firmId: user.firmId,
      },
      include: {
        client: true,
        createdByUser: true,
        firm: true,
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    const rows = appointments.map((item) => ({
      ID: item.id,
      Advocacia: item.firm?.name ?? "",
      Cliente: item.client?.name ?? "",
      Documento: item.client?.document ?? "",
      Status: item.status ?? "",
      "Data/Hora": formatDate(item.scheduledAt),
      Assunto: "",
      Observacoes: item.notes ?? "",
      "Motivo Cancelamento": "",
      CriadoPor: item.createdByUser?.name ?? "",
      CriadoEm: formatDate(item.createdAt),
      AtualizadoEm: formatDate(item.updatedAt),
    }));

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="agendamentos-${stamp}.xlsx"`,
        },
      });
    }

    const headers = Object.keys(rows[0] ?? {
      ID: "",
      Cliente: "",
      Documento: "",
      Status: "",
      "Data/Hora": "",
      Assunto: "",
      Observacoes: "",
      "Motivo Cancelamento": "",
      CriadoPor: "",
      CriadoEm: "",
      AtualizadoEm: "",
    });

    const csvLines = [
      headers.map(escapeCsv).join(";"),
      ...rows.map((row) => headers.map((key) => escapeCsv((row as Record<string, unknown>)[key])).join(";")),
    ];

    const csv = "\uFEFF" + csvLines.join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agendamentos-${stamp}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/appointments/export]", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao exportar agendamentos." },
      { status: 500 }
    );
  }
}