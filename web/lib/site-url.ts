/** Resolves the app's own public URL: Vercel's stable production domain when
 * deployed there, falling back to SITE_URL (set in .env.local for local dev). */
export function getSiteUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.SITE_URL ?? "http://localhost:3000";
}
