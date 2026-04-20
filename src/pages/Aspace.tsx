import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta ASPACE.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Aspace = () => {
  return (
    <RouteProvider defaultRoute="ASPACE">
      <RouteTemplate 
        routeCode="ASPACE" 
        routeName={getRouteDisplayName("ASPACE")} 
      />
    </RouteProvider>
  );
};

export default Aspace;
