import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "deal_radar_admin";
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

interface AdminAuthConfig {
  username?: string;
  passwordSalt?: string;
  passwordHash?: string;
  sessionSecret?: string;
}

interface AdminSessionPayload {
  exp: number;
  iat: number;
  sub: string;
  v: 1;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function configuredAdminAuth(): AdminAuthConfig {
  return {
    username: process.env.ADMIN_USERNAME,
    passwordSalt: process.env.ADMIN_PASSWORD_SALT,
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    sessionSecret: process.env.ADMIN_SESSION_SECRET
  };
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function deriveAdminPasswordHash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyAdminCredentials(
  username: string,
  password: string,
  config: AdminAuthConfig = configuredAdminAuth()
): boolean {
  const expectedUsername = config.username ?? "";
  const salt = config.passwordSalt ?? "unconfigured-admin-salt";
  const expectedHash = config.passwordHash ?? "0".repeat(128);
  const actualHash = deriveAdminPasswordHash(password, salt);
  return Boolean(config.username && config.passwordSalt && config.passwordHash && config.sessionSecret)
    && safeEqual(username, expectedUsername)
    && safeEqual(actualHash, expectedHash);
}

export function createAdminSessionToken(
  username: string,
  config: AdminAuthConfig = configuredAdminAuth(),
  now = Date.now()
): string | undefined {
  if (!config.sessionSecret || !config.username || !safeEqual(username, config.username)) return undefined;
  const issuedAt = Math.floor(now / 1_000);
  const payload: AdminSessionPayload = {
    exp: issuedAt + ADMIN_SESSION_TTL_SECONDS,
    iat: issuedAt,
    sub: config.username,
    v: 1
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", config.sessionSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  config: AdminAuthConfig = configuredAdminAuth(),
  now = Date.now()
): boolean {
  if (!token || !config.sessionSecret || !config.username) return false;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  const expectedSignature = createHmac("sha256", config.sessionSecret).update(encoded).digest("base64url");
  if (!safeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    const current = Math.floor(now / 1_000);
    return payload.v === 1
      && typeof payload.iat === "number"
      && payload.iat <= current + 60
      && typeof payload.exp === "number"
      && payload.exp > current
      && typeof payload.sub === "string"
      && safeEqual(payload.sub, config.username);
  } catch {
    return false;
  }
}

export function adminSessionFromRequest(request: Request): boolean {
  try {
    const cookie = request.headers.get("cookie")
      ?.split(";")
      .map((value) => value.trim().split("="))
      .find(([name]) => name === ADMIN_SESSION_COOKIE)?.slice(1).join("=");
    return verifyAdminSessionToken(cookie ? decodeURIComponent(cookie) : undefined);
  } catch {
    return false;
  }
}

export function hasValidBearerToken(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authorization.slice(7)), digest(secret));
}

export function canRunManualCrawl(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return hasValidBearerToken(request, secret);
}

export function canViewAdminData(request: Request): boolean {
  return adminSessionFromRequest(request) || canRunManualCrawl(request);
}
