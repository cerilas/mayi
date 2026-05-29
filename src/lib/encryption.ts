import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.PASSWORD_ENCRYPTION_KEY;

/** Returns a 32-byte key derived from env var, or a deterministic fallback. */
function getKey(): Buffer {
  if (KEY_HEX && KEY_HEX.length >= 64) {
    return Buffer.from(KEY_HEX.slice(0, 64), "hex");
  }
  // Fallback: derive from NEXTAUTH_SECRET (never empty in production)
  const secret = process.env.NEXTAUTH_SECRET || "fallback-secret-change-me";
  const { createHash } = require("crypto");
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext password and returns a base64-encoded string
 * in the format: iv:authTag:ciphertext
 */
export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a previously encrypted password string.
 * Returns null if decryption fails.
 */
export function decryptPassword(encrypted: string): string | null {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) return null;
    const [ivB64, authTagB64, cipherB64] = parts;
    const key = getKey();
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(cipherB64, "base64");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
