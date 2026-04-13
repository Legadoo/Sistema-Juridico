export type MercadoPagoCredentials = {
  accessToken: string;
  publicKey?: string | null;
};

export type MercadoPagoPreferenceInput = {
  title: string;
  amount: number;
  externalReference: string;
  payerEmail?: string | null;
  description?: string | null;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  date_created?: string;
};

function getBaseUrl() {
  return "https://api.mercadopago.com";
}

function getAppUrl() {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    throw new Error("APP_URL não configurada no .env.");
  }
  return appUrl.replace(/\/+$/, "");
}

function buildHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export async function validateMercadoPagoCredentials(
  credentials: MercadoPagoCredentials,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${getBaseUrl()}/users/me`, {
      method: "GET",
      headers: buildHeaders(credentials.accessToken),
      cache: "no-store",
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      return {
        ok: false,
        message:
          json?.message ||
          json?.error ||
          "Credenciais do Mercado Pago inválidas.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("validateMercadoPagoCredentials error:", error);
    return { ok: false, message: "Falha ao validar Mercado Pago." };
  }
}

export async function createMercadoPagoPreference(
  credentials: MercadoPagoCredentials,
  input: MercadoPagoPreferenceInput,
) {
  const appUrl = getAppUrl();

  const body = {
    items: [
      {
        title: input.title,
        description: input.description ?? undefined,
        quantity: 1,
        unit_price: Number(input.amount),
        currency_id: "BRL",
      },
    ],
    payer: input.payerEmail
      ? {
          email: input.payerEmail,
        }
      : undefined,
    external_reference: input.externalReference,
    back_urls: {
      success: `${appUrl}/admin/charges`,
      pending: `${appUrl}/admin/charges`,
      failure: `${appUrl}/admin/charges`,
    },
    auto_return: "approved",
    notification_url: `${appUrl}/api/webhooks/mercado-pago`,
  };

  const response = await fetch(`${getBaseUrl()}/checkout/preferences`, {
    method: "POST",
    headers: buildHeaders(credentials.accessToken),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | (MercadoPagoPreferenceResponse & {
        message?: string;
        error?: string;
      })
    | null;

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Falha ao criar preferência no Mercado Pago.",
    );
  }

  return {
    providerPreferenceId: data?.id ?? null,
    initPoint: data?.init_point ?? null,
    sandboxInitPoint: data?.sandbox_init_point ?? null,
    paymentUrl: data?.init_point ?? data?.sandbox_init_point ?? null,
    createdAt: data?.date_created ?? null,
  };
}

export async function getMercadoPagoPaymentById(
  credentials: MercadoPagoCredentials,
  paymentId: string | number,
) {
  const response = await fetch(`${getBaseUrl()}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: buildHeaders(credentials.accessToken),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Falha ao consultar pagamento no Mercado Pago.",
    );
  }

  return data;
}

export function parseMercadoPagoWebhook(body: unknown): {
  type?: string;
  action?: string;
  dataId?: string | number | null;
} {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as Record<string, unknown>;
  const data = payload.data as Record<string, unknown> | undefined;

  return {
    type: typeof payload.type === "string" ? payload.type : undefined,
    action: typeof payload.action === "string" ? payload.action : undefined,
    dataId:
      data && (typeof data.id === "string" || typeof data.id === "number")
        ? data.id
        : null,
  };
}