export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
export const SAO_PAULO_UTC_OFFSET = "-03:00";

export function normalizeBrazilDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || !month || !day) return null;

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function getSaoPauloDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível normalizar a data no fuso de São Paulo.");
  }

  return `${year}-${month}-${day}`;
}

export function parseSaoPauloDateOnly(value: string) {
  const dateKey = normalizeBrazilDateKey(value);

  if (!dateKey) return null;

  return new Date(`${dateKey}T12:00:00.000${SAO_PAULO_UTC_OFFSET}`);
}

export function parseSaoPauloDateTimeInput(
  value: string | Date | null | undefined,
  fallbackTime = "00:00"
) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value || "").trim();

  if (!raw) return null;

  const dateOnly = normalizeBrazilDateKey(raw);

  if (dateOnly) {
    return new Date(`${dateOnly}T${fallbackTime}:00.000${SAO_PAULO_UTC_OFFSET}`);
  }

  const localDateTimeMatch = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/.exec(raw);

  if (localDateTimeMatch) {
    const dateKey = normalizeBrazilDateKey(localDateTimeMatch[1]);
    const time = localDateTimeMatch[2];
    const seconds = localDateTimeMatch[3] || "00";

    if (!dateKey) return null;

    return new Date(`${dateKey}T${time}:${seconds}.000${SAO_PAULO_UTC_OFFSET}`);
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function combineSaoPauloDateAndTime(date: Date, time: string) {
  const dateKey = getSaoPauloDateKey(date);
  return parseSaoPauloDateTimeInput(`${dateKey}T${time}`);
}

export function formatSaoPauloDate(value?: string | Date | null) {
  if (!value) return "Sem data";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(date);
}

export function formatSaoPauloDateTime(value?: string | Date | null) {
  if (!value) return "Sem data";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(date);
}

export function formatSaoPauloInputDateTime(value?: string | Date | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!year || !month || !day || !hour || !minute) return "";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function startOfSaoPauloDay(value = new Date()) {
  const dateKey = getSaoPauloDateKey(value);
  const date = parseSaoPauloDateTimeInput(`${dateKey}T00:00`);

  if (!date) {
    throw new Error("Não foi possível calcular o início do dia em São Paulo.");
  }

  return date;
}

export function endOfSaoPauloDay(value = new Date()) {
  const dateKey = getSaoPauloDateKey(value);
  const date = parseSaoPauloDateTimeInput(`${dateKey}T23:59:59`);

  if (!date) {
    throw new Error("Não foi possível calcular o fim do dia em São Paulo.");
  }

  return date;
}

export function addDaysSaoPaulo(value: Date, days: number) {
  const start = startOfSaoPauloDay(value);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}