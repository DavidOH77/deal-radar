export const DOMAIN_SCHEMA_VERSION = "0001_source_observations";

function shortCommit(value?: string): string {
  return value?.trim() ? value.trim().slice(0, 12) : "local";
}

export function releaseMetadata(env: NodeJS.ProcessEnv = process.env) {
  return {
    commit: shortCommit(env.VERCEL_GIT_COMMIT_SHA || env.GIT_COMMIT_SHA),
    environment: env.VERCEL_ENV || (env.NODE_ENV === "production" ? "production" : "development"),
    domainModel: {
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      shadowWriteEnabled: env.DEAL_DOMAIN_SHADOW_WRITE === "1",
      databaseConfigured: Boolean(env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim())
    }
  };
}
