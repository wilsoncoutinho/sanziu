import crypto from "crypto";

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  // pragmatic email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateSixDigitCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export function hashToken(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}
