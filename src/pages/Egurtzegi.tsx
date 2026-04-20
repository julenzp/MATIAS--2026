import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página individual para la ruta MATIA USURBIL.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 * Accesible en /egurtzegi
 */
const Egurtzegi = () => {
  return (
    <RouteProvider defaultRoute="EGURTZEGI">
      <RouteTemplate 
        routeCode="EGURTZEGI" 
        routeName={getRouteDisplayName("EGURTZEGI")} 
        showLogo={true}
      />
    </RouteProvider>
  );
};

export default Egurtzegi;
