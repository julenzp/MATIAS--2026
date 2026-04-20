/** Routes visible to MATIA profile (read-only) */
export const MATIA_ALLOWED_ROUTES = [
  "Matia Bermingham",
  "Matia Fraisoro",
  "Matia Fraisoro 2",
  "Matia Igeldo",
  "Matia Lasarte",
  "Matia Rezola",
  "Matia Usurbil",
  "Matia Lamorouse",
  "Matia Argixao 1",
  "Matia Argixao 2",
] as const;

export const isMatiaRoute = (route: string): boolean =>
  MATIA_ALLOWED_ROUTES.includes(route as any);
