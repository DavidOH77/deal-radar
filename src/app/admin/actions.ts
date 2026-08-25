"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearAdminLoginAttempts, consumeAdminLoginAttempt } from "@/lib/server/admin-rate-limit";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminCredentials
} from "@/lib/server/auth";

function clientIdentifier(headerStore: Headers): string {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headerStore.get("x-real-ip")
    || "unknown";
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const identifier = clientIdentifier(await headers());
  if (!(await consumeAdminLoginAttempt(identifier))) redirect("/admin/login?error=limited");

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminCredentials(username, password)) redirect("/admin/login?error=invalid");

  const token = createAdminSessionToken(username);
  if (!token) redirect("/admin/login?error=unavailable");
  await clearAdminLoginAttempts(identifier);
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
  redirect("/status");
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  redirect("/");
}
