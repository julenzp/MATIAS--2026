import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta BERMINGHAM.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Bermingham = () => {
  return (
    <RouteProvider defaultRoute="BERMINGHAM">
      <RouteTemplate 
        routeCode="BERMINGHAM" 
        routeName={getRouteDisplayName("BERMINGHAM")} 
      />
    </RouteProvider>
  );
};

export default Bermingham;
