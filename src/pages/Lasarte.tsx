import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta MATIA LASARTE.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Lasarte = () => {
  return (
    <RouteProvider defaultRoute="LASARTE">
      <RouteTemplate 
        routeCode="LASARTE" 
        routeName={getRouteDisplayName("LASARTE")} 
      />
    </RouteProvider>
  );
};

export default Lasarte;
