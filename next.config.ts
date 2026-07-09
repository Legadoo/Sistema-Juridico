import type { NextConfig } from "next";

const NO_STORE_HEADERS = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "Vary", value: "Cookie" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/login",
        headers: NO_STORE_HEADERS,
      },
      {
        source: "/api/me",
        headers: NO_STORE_HEADERS,
      },
      {
        source: "/api/auth/login",
        headers: NO_STORE_HEADERS,
      },
      {
        source: "/api/auth/logout",
        headers: NO_STORE_HEADERS,
      },
    ];
  },
};

export default nextConfig;
