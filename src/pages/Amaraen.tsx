import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta GUREAK, Amaraene.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const Amaraen = () => {
  return (
    <RouteProvider defaultRoute="AMARAEN">
      <RouteTemplate 
        routeCode="AMARAEN" 
        routeName={getRouteDisplayName("AMARAEN")} 
        showLogo={true} 
      />
    </RouteProvider>
  );
};

export default Amaraen;
