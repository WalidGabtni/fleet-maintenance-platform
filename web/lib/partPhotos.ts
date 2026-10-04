import type { getSupabaseClient } from "./supabase";

export async function signPartPhotoUrls(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (uniquePaths.length === 0) return new Map();

  const { data } = await supabase.storage.from("part-photos").createSignedUrls(uniquePaths, 3600);

  const map = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  }
  return map;
}
