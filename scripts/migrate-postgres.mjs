import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is required.");

const directory = resolve(process.cwd(), "db/migrations");
const migrationNames = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const sql = neon(url, { fetchOptions: { cache: "no-store" } });

await sql`
  create table if not exists app_schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )
`;

for (const name of migrationNames) {
  const contents = await readFile(resolve(directory, name), "utf8");
  const checksum = createHash("sha256").update(contents).digest("hex");
  const applied = await sql`select checksum from app_schema_migrations where name = ${name}`;
  if (applied.length) {
    if (applied[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
    continue;
  }

  const statements = contents
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const transaction = statements.map((statement) => sql.query(statement));
  transaction.push(sql`insert into app_schema_migrations (name, checksum) values (${name}, ${checksum})`);
  await sql.transaction(transaction);
  process.stdout.write(`Applied ${name}\n`);
}
