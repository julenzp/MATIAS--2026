import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta ARGIXAO BUS 2.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Argixao2 = () => {
  return (
    <RouteProvider defaultRoute="ARGIXAO_2">
      <RouteTemplate 
        routeCode="ARGIXAO_2" 
        routeName={getRouteDisplayName("ARGIXAO_2")} 
      />
    </RouteProvider>
  );
};

export default Argixao2;
