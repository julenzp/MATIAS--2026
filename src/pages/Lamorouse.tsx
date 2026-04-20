import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA LAMOROUSE.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Lamorouse = () => {
  return (
    <RouteProvider defaultRoute="LAMOROUSE">
      <RouteTemplate 
        routeCode="LAMOROUSE" 
        routeName={getRouteDisplayName("LAMOROUSE")} 
      />
    </RouteProvider>
  );
};

export default Lamorouse;
