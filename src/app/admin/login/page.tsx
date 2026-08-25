import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { hasAdminSession } from "@/lib/server/admin-session";
import { loginAdmin } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관리자 로그인 | 딜레이더", robots: { index: false, follow: false } };

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "아이디 또는 비밀번호를 확인하세요.",
  limited: "로그인 시도가 많습니다. 15분 후 다시 시도하세요.",
  unavailable: "관리자 로그인을 사용할 수 없습니다."
};

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasAdminSession()) redirect("/status");
  const { error } = await searchParams;

  return (
    <AppShell>
      <section className="admin-login-shell">
        <div className="admin-login-panel">
          <div className="admin-login-heading">
            <MaterialIcon name="key" size={21} />
            <div>
              <h1>관리자 로그인</h1>
              <p>수집 상태와 데이터 품질을 관리합니다.</p>
            </div>
          </div>
          <form className="admin-login-form" action={loginAdmin}>
            <label className="field-label">
              아이디
              <span className="admin-input"><input name="username" autoComplete="username" required /></span>
            </label>
            <label className="field-label">
              비밀번호
              <span className="admin-input"><input name="password" type="password" autoComplete="current-password" required /></span>
            </label>
            {error && ERROR_MESSAGES[error] ? <p className="admin-login-error" role="alert">{ERROR_MESSAGES[error]}</p> : null}
            <button className="admin-login-button" type="submit">로그인</button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
