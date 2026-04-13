import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("APP_SECRET ausente ou muito curto. Defina APP_SECRET no .env.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(value: string): string {
  if (!value) {
    throw new Error("Valor ausente para criptografia.");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptText(payload: string): string {
  if (!payload) {
    throw new Error("Payload ausente para descriptografia.");
  }

  const [ivHex, encryptedHex] = payload.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Payload criptografado inválido.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}