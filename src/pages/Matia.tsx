import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Matia = () => {
  return (
    <RouteProvider defaultRoute="MATIA">
      <RouteTemplate 
        routeCode="MATIA" 
        routeName={getRouteDisplayName("MATIA")} 
      />
    </RouteProvider>
  );
};

export default Matia;
