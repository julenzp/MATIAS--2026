import { useState } from "react";
import {
  MapPin, Clock, Bus, Volume2, AlertCircle, Copy, Check, X,
  MessageSquare, ArrowDown, Sunrise, Sunset, Users, Home,
  Building2, ArrowRight, RotateCcw, Accessibility, MessageSquareWarning,
  Calendar, Shield, LogOut, RefreshCw, ChevronRight
} from "lucide-react";

// ─── Datos de demo ──────────────────────────────────────────────────────────
const ROUTE = "ASPACE INTXAURRONDO";
const TODAY = "Osteguna, 18 Otsaila / Jueves, 18 Febrero";

const TRIPS_MORNING = [
  { id: "1", time: "08:10", user: "Ander Etxeberria", location: "Avda. Tolosa 42", type: "", reg: 12, status: "present", actualTime: "08:12" },
  { id: "2", time: "08:18", user: "Miren Zubieta", location: "C/ Hernani 7, Portal 3", type: "S", reg: 7, status: "pending", actualTime: null },
  { id: "3", time: "08:25", user: "Joseba Arregui", location: "Plaza Gipuzkoa s/n", type: "", reg: 3, status: "absent", actualTime: null },
  { id: "4", time: "08:35", user: "Amaia Beristain", location: "C/ San Martín 15", type: "", reg: 21, status: "pending", actualTime: null },
];

// ─── Subcomponentes de mockup ────────────────────────────────────────────────

const PhoneShell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative bg-slate-950 rounded-[2.2rem] p-[10px] shadow-2xl border border-slate-700 w-[300px] ${className}`}>
    {/* Notch */}
    <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-24 h-[18px] bg-slate-950 rounded-b-2xl z-10 border-b border-slate-700" />
    <div className="bg-white rounded-[1.7rem] overflow-hidden min-h-[560px] flex flex-col">
      {children}
    </div>
  </div>
);

// Header de la app real
const AppHeader = ({ route }: { route: string }) => (
  <div className="bg-[hsl(199,89%,28%)] px-3 pt-8 pb-2 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
        <Bus size={14} className="text-white" />
      </div>
      <span className="text-white font-bold text-sm tracking-wide">{route}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
        <RefreshCw size={11} className="text-white" />
      </div>
      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
        <Shield size={11} className="text-white" />
      </div>
    </div>
  </div>
);

// Tabs de navegación reales — fiel al diseño actual (blancas con borde inactivas, color sólido activas)
const AppTabs = ({ active }: { active: "morning" | "afternoon" | "contacts" }) => (
  <div className="px-2 py-2 bg-[hsl(210,30%,95%)]">
    <div className="grid grid-cols-3 gap-1 bg-[hsl(210,30%,88%)] border border-[hsl(210,25%,82%)] rounded-xl p-1">
      {[
        { key: "morning",   icon: <Sunrise size={14} />, label: "Mañana",    activeBg: "bg-[hsl(199,89%,32%)]", activeText: "text-white" },
        { key: "afternoon", icon: <Sunset  size={14} />, label: "Tarde",     activeBg: "bg-[hsl(160,65%,36%)]", activeText: "text-white" },
        { key: "contacts",  icon: <Users   size={14} />, label: "Contactos", activeBg: "bg-[hsl(35,95%,52%)]",  activeText: "text-[hsl(215,40%,12%)]" },
      ].map(tab => (
        <div
          key={tab.key}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
            active === tab.key
              ? `${tab.activeBg} ${tab.activeText} shadow`
              : "bg-white text-[hsl(215,25%,38%)] border border-[hsl(210,25%,82%)]"
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// Reloj digital
const AppClock = ({ variant }: { variant: "morning" | "afternoon" }) => (
  <div className={`mx-3 my-1 px-3 py-1.5 rounded-xl text-center font-mono font-bold text-base shadow-sm border ${
    variant === "morning"
      ? "bg-[hsl(199,89%,96%)] border-[hsl(199,89%,80%)] text-[hsl(199,89%,28%)]"
      : "bg-[hsl(160,65%,95%)] border-[hsl(160,65%,70%)] text-[hsl(160,65%,28%)]"
  }`}>
    08:14
  </div>
);

// Indicador de dirección
const DirectionBar = () => (
  <div className="flex items-center justify-center gap-2 mx-3 my-1">
    <div className="flex items-center gap-1 bg-[hsl(210,30%,95%)] px-2 py-1 rounded-lg text-[10px] text-[hsl(215,25%,38%)]">
      <Home size={10} /> Etxetik
    </div>
    <ArrowRight size={12} className="text-[hsl(199,89%,32%)]" />
    <div className="flex items-center gap-1 bg-[hsl(210,30%,95%)] px-2 py-1 rounded-lg text-[10px] text-[hsl(215,25%,38%)]">
      <Building2 size={10} /> Zentrora
    </div>
  </div>
);

// Tarjeta de usuario fiel al diseño real
const UserCard = ({
  trip,
  highlight = false,
}: {
  trip: (typeof TRIPS_MORNING)[0];
  highlight?: boolean;
}) => {
  const isPresent = trip.status === "present";
  const isAbsent = trip.status === "absent";
  const isPending = trip.status === "pending";
  const isLate = trip.actualTime && trip.actualTime > trip.time;

  const cardBg = isPresent
    ? "bg-green-50 border-green-300"
    : isAbsent
    ? "bg-red-50 border-red-300"
    : highlight
    ? "bg-amber-50 border-amber-300"
    : "bg-white border-[hsl(210,25%,85%)]";

  return (
    <div className={`border-2 rounded-xl p-2.5 space-y-2 mx-1 ${cardBg} ${highlight ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}>
      {/* Fila 1: hora + nº + badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-base text-[hsl(199,89%,32%)] bg-[hsl(199,89%,96%)] px-2 py-0.5 rounded-lg border border-[hsl(199,89%,75%)]">
            {trip.time}
          </span>
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[hsl(199,89%,90%)] text-[hsl(199,89%,28%)] rounded-full border border-[hsl(199,89%,70%)]">
            {trip.reg}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {trip.type === "S" && <Accessibility size={16} strokeWidth={2.5} className="text-red-500" />}
          {isPresent && (
            <span className="inline-flex items-center gap-0.5 bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
              <Check size={10} /> Presente
            </span>
          )}
          {isAbsent && (
            <span className="inline-flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
              <X size={10} /> Ausente
            </span>
          )}
        </div>
      </div>

      {/* Fila 2: nombre + ubicación */}
      <div>
        <p className={`text-[13px] font-bold leading-tight ${isAbsent ? "line-through text-red-600" : isPresent ? "text-green-700" : "text-[hsl(215,40%,12%)]"}`}>
          {trip.user}
        </p>
        {trip.location && (
          <p className="text-[11px] text-[hsl(215,25%,38%)] flex items-center gap-0.5 mt-0.5">
            <MapPin size={10} /> {trip.location}
          </p>
        )}
      </div>

      {/* Fila 3: hora real + botón T + reset (si registrado) */}
      {trip.actualTime && (
        <div className="flex items-center gap-1.5">
          <div className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-1 rounded-lg shadow text-[11px] ${isLate ? "bg-amber-400 text-amber-900" : "bg-green-500 text-white"}`}>
            <Clock size={11} />
            <span className="opacity-75 text-[9px]">Hora:</span>
            <span className="text-sm tracking-wider">{trip.actualTime}</span>
          </div>
          {isPresent && (
            <div className="h-7 w-7 flex items-center justify-center bg-[hsl(215,40%,12%)] text-white rounded-full text-[10px] font-bold shadow">
              T
            </div>
          )}
          <div className="h-7 px-2 flex items-center justify-center bg-white border border-[hsl(210,25%,85%)] rounded-lg text-[10px] text-[hsl(215,25%,38%)] gap-1 shadow-sm">
            <RotateCcw size={10} /> Reset
          </div>
        </div>
      )}

      {/* Fila 4: acciones (solo pendientes) */}
      {isPending && (
        <div className="flex items-center justify-end pt-1.5 border-t border-[hsl(210,25%,85%)] gap-2">
          <div className="h-9 w-9 flex items-center justify-center bg-green-500 text-white rounded-full shadow border-2 border-green-600">
            <Check size={18} strokeWidth={3} />
          </div>
          <div className="h-9 w-9 flex items-center justify-center bg-red-500 text-white rounded-full shadow border-2 border-red-600">
            <X size={18} strokeWidth={3} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────────────────
const DemoSeguimiento = () => {
  const [copied, setCopied] = useState(false);

  const explanationText = `📱 APP DE GESTIÓN DE RUTAS ERBI — Diseño para auxiliares

El sistema está diseñado exclusivamente para el uso interno de auxiliares y responsables de ruta. La interfaz es compacta, eficiente y orientada a un registro rápido durante el servicio.

━━━━━━━━━━━━━━━━━━━━━━━━━

🗂️ ESTRUCTURA DE LA APP

• Cada ruta tiene su propia PWA instalable en móvil.
• Al abrir la app se muestra la lista de usuarios del turno activo (mañana/tarde).
• Navegación por 3 pestañas: Mañana / Tarde / Contactos.

━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 REGISTRO DE PRESENCIA (Estado: Pendiente)

• Cada tarjeta muestra: hora programada, nº de registro, nombre y ubicación de recogida.
• El auxiliar pulsa ✓ (verde) → usuario marcado como PRESENTE con hora real registrada.
• El auxiliar pulsa ✗ (rojo) → usuario marcado como AUSENTE.

━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ CONTROL DE RETRASO (Botón "T")

• Tras marcar presencia, aparece el botón "T" (Tarde).
• Al pulsarlo, el auxiliar introduce los minutos de retraso.
• La tarjeta muestra la hora real + indicador de retraso en rojo.

━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 RESET

• Al lado del botón "T" aparece el botón Reset.
• Permite revertir el registro de un usuario si se cometió un error.
• Pide confirmación antes de borrar.

━━━━━━━━━━━━━━━━━━━━━━━━━

♿ INDICADORES ESPECIALES

• Icono rojo de silla de ruedas → usuario con necesidades especiales (S).
• Icono de aviso naranja → nota activa del administrador sobre el usuario.
• Nº de registro visible en cada tarjeta para identificación rápida.

━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ ACCESO Y SEGURIDAD

• Cada ruta tiene su propia URL/PWA instalable.
• Acceso protegido por PIN de administrador para funciones avanzadas.
• Los datos se sincronizan en tiempo real con el sistema central.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(explanationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[hsl(199,89%,28%)]/20 border border-[hsl(199,89%,28%)]/40 px-4 py-1.5 rounded-full text-[hsl(199,89%,70%)] text-xs font-semibold uppercase tracking-widest mb-4">
          <Bus size={13} /> Uso interno — Auxiliares y responsables
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">App de Ruta ERBI</h1>
        <p className="text-slate-400 text-base">Interfaz real de registro de pasajeros para auxiliares</p>
      </div>

      {/* ── 3 mockups seguimiento (fondo negro) ─────────────────────── */}
      <div className="flex flex-wrap justify-center gap-8 mb-16">

        {/* Estado 1: En curso */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">Estado 1</span>
          <div className="relative bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700 w-[260px]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-950 rounded-b-2xl z-10 border-b border-slate-700" />
            <div className="bg-white rounded-[2rem] overflow-hidden min-h-[420px] flex items-center justify-center">
              <div className="p-6 text-center w-full">
                <h2 className="text-[10px] uppercase tracking-widest text-gray-400 mb-4 font-semibold">Seguimiento ASPACE</h2>
                <div className="bg-blue-100 border-4 border-blue-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Bus className="text-blue-600" size={32} />
                </div>
                <h1 className="text-xl font-bold text-blue-600 mb-1">Ruta en curso</h1>
                <p className="text-gray-800 text-sm font-bold mb-3">María García</p>
                <div className="flex items-center justify-center gap-2 text-gray-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-3 text-sm">
                  <Clock size={14} className="text-blue-600" />
                  <span className="font-mono font-bold">~09:15</span>
                </div>
                <p className="text-gray-400 text-xs">Te avisaremos cuando el autobús esté cerca.</p>
                <p className="text-[9px] text-gray-300 mt-5">Actualizado: 08:42</p>
                <button className="mt-3 flex items-center gap-1.5 mx-auto text-[10px] text-gray-400 px-2 py-1 rounded bg-gray-100 border border-gray-200">
                  <Volume2 size={10} /> Probar sonido
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estado 2: Prepárate */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">Estado 2</span>
          <div className="relative bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700 w-[260px]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-950 rounded-b-2xl z-10 border-b border-slate-700" />
            <div className="bg-orange-50 rounded-[2rem] overflow-hidden min-h-[420px] flex items-center justify-center">
              <div className="p-6 text-center w-full">
                <h2 className="text-[10px] uppercase tracking-widest text-orange-400 mb-4 font-semibold">Seguimiento ASPACE</h2>
                <div className="bg-orange-200 border-4 border-orange-300 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Bus className="text-orange-600" size={32} />
                </div>
                <h1 className="text-xl font-bold text-orange-600 mb-1">¡Prepárate!</h1>
                <p className="text-gray-800 text-sm font-bold mb-3">María García</p>
                <div className="flex items-center justify-center gap-2 text-gray-700 bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 mb-3 text-sm">
                  <Clock size={14} className="text-orange-600" />
                  <span className="font-mono font-bold">~5 min</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs">
                  <MapPin size={12} />
                  <span>Portal 3, Calle Hernani</span>
                </div>
                <div className="mt-3 text-[10px] text-orange-500 flex items-center justify-center gap-1">
                  <Volume2 size={10} /> 🔔 Sonido + vibración automática
                </div>
                <p className="text-[9px] text-gray-400 mt-4">Actualizado: 09:11</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado 3: Sin servicio */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-500/20 text-slate-400">Estado 3</span>
          <div className="relative bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700 w-[260px]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-950 rounded-b-2xl z-10 border-b border-slate-700" />
            <div className="bg-gray-200 rounded-[2rem] overflow-hidden min-h-[420px] flex items-center justify-center">
              <div className="p-6 text-center w-full">
                <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-semibold">Seguimiento ASPACE</h2>
                <div className="bg-gray-300 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Bus className="text-gray-500" size={32} />
                </div>
                <h1 className="text-lg font-bold text-gray-600 mb-2">Sin servicio programado</h1>
                <p className="text-gray-500 text-xs">No hay recogidas pendientes en este momento.</p>
                <p className="text-[9px] text-gray-400 mt-8">Actualizado: 13:20</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Leyenda de iconos */}
      <div className="max-w-2xl mx-auto mb-12">
        <h2 className="text-white font-bold text-lg mb-4 text-center">Leyenda de elementos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: <Check size={16} className="text-white" />, bg: "bg-green-500", label: "Marcar presente" },
            { icon: <X size={16} className="text-white" />, bg: "bg-red-500", label: "Marcar ausente" },
            { icon: <span className="text-white text-xs font-bold">T</span>, bg: "bg-slate-800", label: "Registrar retraso" },
            { icon: <RotateCcw size={14} className="text-slate-600" />, bg: "bg-white border border-slate-300", label: "Reset (corregir error)" },
            { icon: <Accessibility size={16} className="text-red-500" />, bg: "bg-white border border-slate-300", label: "Necesidades especiales" },
            { icon: <MessageSquareWarning size={16} className="text-amber-500" />, bg: "bg-white border border-slate-300", label: "Aviso del administrador" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}>
                {item.icon}
              </div>
              <span className="text-slate-300 text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Texto copiable */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📋 Descripción del sistema
          </h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(199,89%,32%)] hover:bg-[hsl(199,89%,26%)] text-white rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "¡Copiado!" : "Copiar texto"}
          </button>
        </div>
        <pre className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed overflow-auto max-h-[500px]">
          {explanationText}
        </pre>
      </div>

      <p className="text-center text-slate-600 text-xs mt-10">
        Presentación interna — Sistema de rutas ERBI · Uso exclusivo para auxiliares y responsables
      </p>
    </div>
  );
};

export default DemoSeguimiento;
