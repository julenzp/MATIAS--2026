/** Routes visible to MATIA profile (read-only) */
export const MATIA_ALLOWED_ROUTES = [
  "EGURTZEGI",
  "MATIA",
  "BERMINGHAM",
  "IGELDO",
  "LASARTE",
  "FRAISORO",
  "FRAISORO2",
  "LAMOROUSE",
  "ARGIXAO1",
  "ARGIXAO2",
  "ASPACE",
] as const;

export const isMatiaRoute = (route: string): boolean =>
  MATIA_ALLOWED_ROUTES.includes(route as any);
