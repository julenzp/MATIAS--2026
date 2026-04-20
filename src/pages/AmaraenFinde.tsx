import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página independiente para la ruta GUREAK, Amaraene FINDE.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 */
const AmaraenFinde = () => {
  return (
    <RouteProvider defaultRoute="AMARAEN FINDE">
      <RouteTemplate 
        routeCode="AMARAEN FINDE" 
        routeName={getRouteDisplayName("AMARAEN FINDE")} 
        showLogo={true} 
      />
    </RouteProvider>
  );
};

export default AmaraenFinde;
