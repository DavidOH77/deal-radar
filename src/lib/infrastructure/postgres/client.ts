import "server-only";
import { neon } from "@neondatabase/serverless";

type DomainSql = ReturnType<typeof neon>;

const globalForDomainDatabase = globalThis as typeof globalThis & {
  dealDomainSql?: DomainSql;
};

export function domainDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || undefined;
}

export function domainDatabaseConfigured(): boolean {
  return Boolean(domainDatabaseUrl());
}

export function domainSql(): DomainSql {
  const url = domainDatabaseUrl();
  if (!url) throw new Error("Domain Postgres is not configured.");
  if (!globalForDomainDatabase.dealDomainSql) {
    globalForDomainDatabase.dealDomainSql = neon(url, {
      fetchOptions: { cache: "no-store" }
    });
  }
  return globalForDomainDatabase.dealDomainSql;
}
