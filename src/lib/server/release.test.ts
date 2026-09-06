import { describe, expect, it } from "vitest";
import { DOMAIN_SCHEMA_VERSION, releaseMetadata } from "./release";

describe("releaseMetadata", () => {
  it("reports a bounded release id and the domain migration state without exposing credentials", () => {
    const metadata = releaseMetadata({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "1234567890abcdef",
      DATABASE_URL: "postgresql://secret",
      DEAL_DOMAIN_SHADOW_WRITE: "1"
    });

    expect(metadata).toEqual({
      commit: "1234567890ab",
      environment: "preview",
      domainModel: {
        schemaVersion: DOMAIN_SCHEMA_VERSION,
        shadowWriteEnabled: true,
        databaseConfigured: true
      }
    });
    expect(JSON.stringify(metadata)).not.toContain("postgresql://secret");
  });

  it("uses explicit local defaults before Postgres is provisioned", () => {
    expect(releaseMetadata({ NODE_ENV: "development" })).toEqual({
      commit: "local",
      environment: "development",
      domainModel: {
        schemaVersion: DOMAIN_SCHEMA_VERSION,
        shadowWriteEnabled: false,
        databaseConfigured: false
      }
    });
  });
});
