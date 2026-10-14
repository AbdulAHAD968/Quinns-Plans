import { randomBytes, createHash, timingSafeEqual } from "crypto";

export function generateDownloadToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function isValidToken(expectedHash, provided) {
  if (!expectedHash || !provided) return false;
  const providedHash = createHash("sha256").update(provided).digest("hex");
  const expectedBuf = Buffer.from(expectedHash);
  const providedBuf = Buffer.from(providedHash);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
