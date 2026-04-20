import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA IGELDO.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Igeldo = () => {
  return (
    <RouteProvider defaultRoute="IGELDO">
      <RouteTemplate 
        routeCode="IGELDO" 
        routeName={getRouteDisplayName("IGELDO")} 
      />
    </RouteProvider>
  );
};

export default Igeldo;