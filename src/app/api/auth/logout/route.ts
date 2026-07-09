import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie",
};

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
