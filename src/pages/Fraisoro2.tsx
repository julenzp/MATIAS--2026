import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA FRAISORO 2 (BUS 2).
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Fraisoro2 = () => {
  return (
    <RouteProvider defaultRoute="FRAISORO_2">
      <RouteTemplate 
        routeCode="FRAISORO_2" 
        routeName={getRouteDisplayName("FRAISORO_2")} 
      />
    </RouteProvider>
  );
};

export default Fraisoro2;
