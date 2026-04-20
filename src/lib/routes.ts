/** Devuelve el nombre de la ruta CON número (para desplegables/selectores) */
export const getRouteLabel = (route: string): string => {
  switch (route) {
    case "TODAS":
      return "TODAS";
    case "ASPACE":
      return "1. ASPACE INTXAURRONDO";
    case "AMARAEN":
      return "GUREAK, Amaraene"; /* oculta temporalmente — sin número */
    case "AMARAEN FINDE":
      return "2. GUREAK, Amaraene FINDE";
    case "BERMINGHAM":
      return "3. MATIA BERMINGHAM";
    case "FRAISORO":
      return "4. MATIA FRAISORO";
    case "FRAISORO_2":
      return "5. MATIA FRAISORO 2";
    case "IGELDO":
      return "6. MATIA IGELDO";
    case "LAMOROUSE":
      return "7. MATIA LAMOROUSE";
    case "LASARTE":
      return "8. MATIA LASARTE";
    case "MATIA":
      return "9. MATIA REZOLA";
    case "EGURTZEGI":
      return "10. MATIA USURBIL";
    case "ARGIXAO_1":
      return "11. MATIA ARGIXAO BUS 1";
    case "ARGIXAO_2":
      return "12. MATIA ARGIXAO BUS 2";
    default:
      return route;
  }
};

/** Devuelve el nombre de la ruta SIN número (para títulos, anuncios, etc.) */
export const getRouteDisplayName = (route: string): string => {
  switch (route) {
    case "TODAS":
      return "TODAS";
    case "ASPACE":
      return "ASPACE INTXAURRONDO";
    case "AMARAEN":
      return "GUREAK, Amaraene";
    case "AMARAEN FINDE":
      return "GUREAK, Amaraene FINDE";
    case "BERMINGHAM":
      return "MATIA BERMINGHAM";
    case "FRAISORO":
      return "MATIA FRAISORO";
    case "FRAISORO_2":
      return "MATIA FRAISORO 2";
    case "IGELDO":
      return "MATIA IGELDO";
    case "LAMOROUSE":
      return "MATIA LAMOROUSE";
    case "LASARTE":
      return "MATIA LASARTE";
    case "MATIA":
      return "MATIA REZOLA";
    case "EGURTZEGI":
      return "MATIA USURBIL";
    case "ARGIXAO_1":
      return "MATIA ARGIXAO BUS 1";
    case "ARGIXAO_2":
      return "MATIA ARGIXAO BUS 2";
    default:
      return route;
  }
};
