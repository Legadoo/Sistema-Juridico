import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NO_STORE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasCookie = req.cookies.get("juriflow_session")?.value;
    if (!hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);

      const response = NextResponse.redirect(url);
      response.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      response.headers.set("Vary", "Cookie");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
