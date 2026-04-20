import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import erbiLogo from "@/assets/erbi-logo-clean.png";

const AdminPin = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const navigate = useNavigate();

  const isValidCode = (value: string) => /^\d{5}[A-Za-z]$/.test(value);

  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^0-9A-Za-z]/g, '');
    const numbers = cleaned.slice(0, 5).replace(/[^0-9]/g, '');
    const letter = cleaned.slice(5, 6).replace(/[^A-Za-z]/g, '').toUpperCase();
    return numbers + letter;
  };

  const codeToEmail = (code: string) => `${code.toLowerCase()}@erbi.local`;

  const handleErbiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCode(code)) {
      toast.error("Código inválido. Formato: 5 números + 1 letra");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: codeToEmail(code),
        password: code.toUpperCase(),
      });
      if (error) {
        toast.error("Código no reconocido. Contacta con el administrador.");
        setCode("");
      } else if (data.user) {
        try {
          localStorage.removeItem('erbi:matia_session');
        } catch {}
        supabase.functions.invoke('notify-login', {
          body: { profile_type: 'ERBI', user_code: code.toUpperCase() },
        }).catch(() => {});
        toast.success("Acceso ERBI concedido");
        navigate("/");
      }
    } catch {
      toast.error("Error inesperado");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCode(newCode)) {
      toast.error("Código inválido. Formato: 5 números + 1 letra");
      return;
    }
    if (newCode.toUpperCase() !== confirmCode.toUpperCase()) {
      toast.error("Los códigos no coinciden");
      return;
    }
    setIsLoading(true);
    try {
      const upper = newCode.toUpperCase();
      const { data, error } = await supabase.auth.signUp({
        email: codeToEmail(upper),
        password: upper,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already") || error.message?.toLowerCase().includes("registered")) {
          toast.error("Ese código ya está en uso. Elige otro.");
        } else {
          toast.error("No se ha podido crear el acceso. Intenta de nuevo.");
        }
      } else if (data.user) {
        try { localStorage.removeItem('erbi:matia_session'); } catch {}
        supabase.functions.invoke('notify-login', {
          body: { profile_type: 'ERBI_NUEVO', user_code: upper },
        }).catch(() => {});
        toast.success("Acceso creado correctamente. Ya puedes entrar.");
        // If session already active, go home; otherwise switch back to login prefilled
        if (data.session) {
          navigate("/");
        } else {
          setMode("login");
          setCode(upper);
          setNewCode("");
          setConfirmCode("");
        }
      }
    } catch {
      toast.error("Error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const isStandalone = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);

  const handleForceUpdate = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      const regs = await navigator.serviceWorker?.getRegistrations();
      if (regs) await Promise.all(regs.map(r => r.unregister()));
    } catch {}
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-2 border-border rounded-3xl shadow-lg p-8 text-center">
          <img src={erbiLogo} alt="Erbi Logo" className="h-24 sm:h-32 mx-auto mb-4 object-contain" />
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-1">
            {mode === "login" ? "Acceso ERBI" : "Crear cuenta nueva"}
          </h1>
          <p className="text-muted-foreground text-base mb-6">
            {mode === "login" ? (
              <>Introduce tu código de acceso<br />(5 números + 1 letra)</>
            ) : (
              <>Elige tu código personal<br />(5 números + 1 letra)</>
            )}
          </p>
          {mode === "login" ? (
          <form onSubmit={handleErbiLogin} className="space-y-5">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="12345A"
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                className="w-full text-center text-4xl tracking-widest uppercase font-extrabold border-2 border-border rounded-2xl px-4 py-5 bg-background text-foreground focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
                maxLength={6}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">Formato DNI: 5 números + 1 letra</p>
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-extrabold rounded-2xl shadow-md"
              disabled={isLoading || !isValidCode(code)}
            >
              {isLoading ? "Verificando..." : "Acceder"}
            </Button>
          </form>
          ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nuevo código (12345A)"
                value={newCode}
                onChange={(e) => setNewCode(formatCode(e.target.value))}
                className="w-full text-center text-3xl tracking-widest uppercase font-extrabold border-2 border-border rounded-2xl px-4 py-4 bg-background text-foreground focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
                maxLength={6}
                autoFocus
              />
              <input
                type="text"
                placeholder="Confirma el código"
                value={confirmCode}
                onChange={(e) => setConfirmCode(formatCode(e.target.value))}
                className="w-full text-center text-3xl tracking-widest uppercase font-extrabold border-2 border-border rounded-2xl px-4 py-4 bg-background text-foreground focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
                maxLength={6}
              />
              <p className="text-sm text-muted-foreground">5 números + 1 letra (ej: 12345A)</p>
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-extrabold rounded-2xl shadow-md"
              disabled={isLoading || !isValidCode(newCode) || !isValidCode(confirmCode)}
            >
              {isLoading ? "Creando..." : "Crear acceso"}
            </Button>
          </form>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setCode("");
              setNewCode("");
              setConfirmCode("");
            }}
            className="block mx-auto text-sm font-semibold text-primary underline hover:text-primary/80 transition-colors mt-5"
          >
            {mode === "login" ? "¿Eres nuevo? Crear cuenta nueva" : "← Volver al acceso"}
          </button>

          {isStandalone && (
            <button
              onClick={handleForceUpdate}
              className="block mx-auto text-sm text-muted-foreground underline hover:text-foreground transition-colors mt-4"
            >
              🔄 Forzar actualización
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPin;
