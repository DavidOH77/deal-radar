export function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return new URL("http://127.0.0.1:3000");
  return new URL(configured.startsWith("http") ? configured : `https://${configured}`);
}
