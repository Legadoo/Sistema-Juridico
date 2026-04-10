export async function fetchMeOrRedirect(setMe: (value: { name: string; role: string }) => void) {
  const meRes = await fetch("/api/me", { cache: "no-store" });

  if (meRes.status === 401) {
    window.location.href = "/login";
    return null;
  }

  if (!meRes.ok) {
    return null;
  }

  const meJson = await meRes.json().catch(() => null);

  const user = meJson?.user;

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const normalized = {
    name: user.name ?? "Usuário",
    role: user.role ?? "SECRETARY",
  };

  setMe(normalized);
  return normalized;
}