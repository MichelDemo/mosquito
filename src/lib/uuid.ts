const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Postgres rejette (exception) une chaîne qui n'est pas un UUID valide là où Supabase
 * renvoyait simplement « pas de ligne ». On filtre donc en amont pour garder les 404.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
