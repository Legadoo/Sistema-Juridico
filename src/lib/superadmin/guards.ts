import { getSessionUser } from "@/lib/session";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  firmId: string | null;
};

function normalizeUser(user: Awaited<ReturnType<typeof getSessionUser>>): AuthenticatedUser | null {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    firmId: user.firmId ?? null,
  };
}

export async function requireSignedInUser() {
  const user = normalizeUser(await getSessionUser());

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireSuperadmin() {
  const user = await requireSignedInUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("FORBIDDEN_SUPERADMIN_ONLY");
  }

  return user;
}

export async function requireFirmScopedUser() {
  const user = await requireSignedInUser();

  if (!user.firmId) {
    throw new Error("FIRM_CONTEXT_REQUIRED");
  }

  return user;
}