const MP_BASE_URL = "https://api.mercadopago.com";

type CreateRecurringPreferenceInput = {
  accessToken: string;
  title: string;
  description: string;
  amount: number;
  payerEmail?: string | null;
  externalReference: string;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export async function createMercadoPagoRecurringPreference(input: CreateRecurringPreferenceInput) {
  const accessToken = input.accessToken;

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED");
  }

  const body = {
    items: [
      {
        title: input.title,
        description: input.description,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(input.amount.toFixed(2)),
      },
    ],
    payer: input.payerEmail
      ? {
          email: input.payerEmail,
        }
      : undefined,
    external_reference: input.externalReference,
  };

  const response = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as MercadoPagoPreferenceResponse | null;

  if (!response.ok || !data?.id) {
    throw new Error("MERCADO_PAGO_PREFERENCE_CREATE_FAILED");
  }

  return {
    preferenceId: data.id,
    initPoint: data.init_point ?? null,
    sandboxInitPoint: data.sandbox_init_point ?? null,
  };
}