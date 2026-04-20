import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta ARGIXAO BUS I.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Argixao = () => {
  return (
    <RouteProvider defaultRoute="ARGIXAO_1">
      <RouteTemplate 
        routeCode="ARGIXAO_1" 
        routeName={getRouteDisplayName("ARGIXAO_1")} 
      />
    </RouteProvider>
  );
};

export default Argixao;
