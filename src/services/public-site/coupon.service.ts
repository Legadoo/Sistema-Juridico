import { prisma } from "@/lib/prisma";

function normalizeCouponCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export async function listPublicCoupons() {
  return prisma.publicCoupon.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createPublicCoupon(input: Record<string, unknown>) {
  const code = normalizeCouponCode(input.code);

  if (!code) {
    throw new Error("Informe o código do cupom.");
  }

  const discountType =
    String(input.discountType ?? "PERCENT").toUpperCase() === "FIXED"
      ? "FIXED"
      : "PERCENT";

  const discountValue = toNumber(input.discountValue);

  if (discountValue <= 0) {
    throw new Error("Informe um valor de desconto válido.");
  }

  if (discountType === "PERCENT" && discountValue > 100) {
    throw new Error("O desconto em porcentagem não pode passar de 100%.");
  }

  const maxUsesRaw = String(input.maxUses ?? "").trim();
  const maxUsesNumber = maxUsesRaw ? Math.max(1, Number(maxUsesRaw)) : null;

  return prisma.publicCoupon.create({
    data: {
      code,
      description: String(input.description ?? "").trim() || null,
      discountType,
      discountValue,
      isActive: Boolean(input.isActive ?? true),
      startsAt: parseOptionalDate(input.startsAt),
      expiresAt: parseOptionalDate(input.expiresAt),
      maxUses: Number.isFinite(maxUsesNumber) ? maxUsesNumber : null,
    },
  });
}

export async function updatePublicCoupon(id: string, input: Record<string, unknown>) {
  const code = normalizeCouponCode(input.code);

  if (!code) {
    throw new Error("Informe o código do cupom.");
  }

  const discountType =
    String(input.discountType ?? "PERCENT").toUpperCase() === "FIXED"
      ? "FIXED"
      : "PERCENT";

  const discountValue = toNumber(input.discountValue);

  if (discountValue <= 0) {
    throw new Error("Informe um valor de desconto válido.");
  }

  if (discountType === "PERCENT" && discountValue > 100) {
    throw new Error("O desconto em porcentagem não pode passar de 100%.");
  }

  const maxUsesRaw = String(input.maxUses ?? "").trim();
  const maxUsesNumber = maxUsesRaw ? Math.max(1, Number(maxUsesRaw)) : null;

  return prisma.publicCoupon.update({
    where: { id },
    data: {
      code,
      description: String(input.description ?? "").trim() || null,
      discountType,
      discountValue,
      isActive: Boolean(input.isActive ?? true),
      startsAt: parseOptionalDate(input.startsAt),
      expiresAt: parseOptionalDate(input.expiresAt),
      maxUses: Number.isFinite(maxUsesNumber) ? maxUsesNumber : null,
    },
  });
}

export async function deletePublicCoupon(id: string) {
  return prisma.publicCoupon.delete({
    where: { id },
  });
}

export async function validateAndCalculatePublicCoupon(params: {
  code: string;
  amount: number;
}) {
  const code = normalizeCouponCode(params.code);

  if (!code) {
    return {
      coupon: null,
      discountAmount: 0,
      finalAmount: params.amount,
    };
  }

  const coupon = await prisma.publicCoupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error("Cupom inválido ou inativo.");
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error("Este cupom ainda não está disponível.");
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new Error("Este cupom expirou.");
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new Error("Este cupom atingiu o limite de uso.");
  }

  let discountAmount = 0;

  if (coupon.discountType === "PERCENT") {
    discountAmount = params.amount * (coupon.discountValue / 100);
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.max(0, Math.min(params.amount, discountAmount));
  const finalAmount = Math.max(1, params.amount - discountAmount);

  return {
    coupon,
    discountAmount: Number(discountAmount.toFixed(2)),
    finalAmount: Number(finalAmount.toFixed(2)),
  };
}
