// Escapes ILIKE wildcard metacharacters (\, %, _) so a literal % or _ the
// user types is matched literally rather than treated as a wildcard, then
// strips ",()" — required because the term is interpolated directly into a
// PostgREST `.or()` filter clause, where those characters are syntax.
export function escapeIlikeTerm(term: string): string {
  const escaped = term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return escaped.replace(/[,()]/g, " ").trim();
}
