import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA FRAISORO 2 (BUS 2).
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Fraisoro = () => {
  return (
    <RouteProvider defaultRoute="FRAISORO">
      <RouteTemplate 
        routeCode="FRAISORO" 
        routeName={getRouteDisplayName("FRAISORO")} 
      />
    </RouteProvider>
  );
};

export default Fraisoro;
