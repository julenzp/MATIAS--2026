import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErbi } from "@/integrations/supabase/erbiClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Link2,
  Copy,
  RefreshCw,
  Users,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  MessageCircle,
  Smartphone,
  Phone,
  
} from "lucide-react";

type TrackingToken = {
  id: string;
  passenger_id: string | null;
  passenger_name: string | null;
  token: string;
  is_active: boolean;
  created_at: string;
  last_access_at: string | null;
  phone_primary: string | null;
  phone_requires_selection: boolean;
};

type PassengerInfo = {
  id: string;
  name: string;
  contact_phone: string | null;
  is_active: boolean;
};

type ShareMode = "whatsapp" | "sms";

export function TrackingAdminPanel() {
  const { isAdmin } = useAuth();
  const [tokens, setTokens] = useState<TrackingToken[]>([]);
  const [aspacePassengers, setAspacePassengers] = useState<PassengerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: tkns }, { data: passengers }] = await Promise.all([
      supabaseErbi.from("tracking_tokens").select("*").eq("route_name", "ASPACE").order("passenger_name"),
      supabaseErbi
        .from("passengers")
        .select("id, name, contact_phone, is_active")
        .eq("route", "ASPACE")
        .eq("is_active", true)
        .order("name"),
    ]);
    const loadedTokens = (tkns as TrackingToken[]) || [];
    const loadedPassengers = (passengers as PassengerInfo[]) || [];

    // Auto-sync: actualizar phone_primary en tracking_tokens si el teléfono
    // del pasajero ha cambiado, para evitar desincronizaciones.
    for (const t of loadedTokens) {
      if (!t.passenger_id) continue;
      const passenger = loadedPassengers.find((p) => p.id === t.passenger_id);
      if (!passenger) continue;

      const phones = parsePhones(passenger.contact_phone);
      const mobiles = phones.filter((p) => p.isMobile);
      let expectedPhone: string | null = null;
      let expectedRequiresSelection = false;

      if (mobiles.length === 1) expectedPhone = mobiles[0].number;
      else if (mobiles.length > 1) {
        // Si ya tenía un phone_primary válido entre los móviles actuales, mantenerlo
        if (t.phone_primary && mobiles.some((m) => m.number === t.phone_primary)) {
          expectedPhone = t.phone_primary;
        } else {
          expectedRequiresSelection = true;
          expectedPhone = null;
        }
      }

      const needsUpdate =
        t.phone_primary !== expectedPhone ||
        t.phone_requires_selection !== expectedRequiresSelection;

      if (needsUpdate) {
        await supabaseErbi
          .from("tracking_tokens")
          .update({
            phone_primary: expectedPhone,
            phone_requires_selection: expectedRequiresSelection,
          })
          .eq("id", t.id);
        // Actualizar en memoria también
        t.phone_primary = expectedPhone;
        t.phone_requires_selection = expectedRequiresSelection;
      }
    }

    setTokens(loadedTokens);
    setAspacePassengers(loadedPassengers);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  const generateToken = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomValues = new Uint32Array(32);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
  };

  const isMobile = (phone: string): boolean => {
    const cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    return /^(\+34)?(6|7)\d{8}$/.test(cleaned) || /^(6|7)\d{8}$/.test(cleaned);
  };

  /** Extract all phone numbers from a contact string, with labels */
  const parsePhones = (contactStr: string | null): { label: string; number: string; isMobile: boolean }[] => {
    if (!contactStr) return [];
    // Split by common separators
    const parts = contactStr
      .split(/[\/]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const results: { label: string; number: string; isMobile: boolean }[] = [];

    for (const part of parts) {
      // Extract number from the part
      const numberMatch = part.match(/(\+?\d[\d\s]{7,})/);
      if (!numberMatch) continue;
      const rawNumber = numberMatch[1].replace(/\s+/g, "");
      // Extract label (everything before the number)
      const labelPart = part.replace(numberMatch[0], "").replace(/[-:,]/g, "").trim();
      const label = labelPart || "Teléfono";
      results.push({
        label,
        number: rawNumber,
        isMobile: isMobile(rawNumber),
      });
    }
    return results;
  };

  /** Get phones for a token by looking up the passenger */
  const getPhonesForToken = (t: TrackingToken): { label: string; number: string; isMobile: boolean }[] => {
    const passenger = aspacePassengers.find((p) => p.id === t.passenger_id);
    if (!passenger) return [];
    return parsePhones(passenger.contact_phone);
  };

  const generateForPassenger = async (passenger: PassengerInfo) => {
    const existing = tokens.find((t) => t.passenger_id === passenger.id);
    if (existing) {
      toast.info(`${passenger.name} ya tiene enlace generado`);
      return;
    }

    let phonePrimary: string | null = null;
    let requiresSelection = false;

    if (passenger.contact_phone) {
      const phones = parsePhones(passenger.contact_phone);
      const mobiles = phones.filter((p) => p.isMobile);
      if (mobiles.length === 1) phonePrimary = mobiles[0].number;
      else if (mobiles.length > 1) requiresSelection = true;
    }

    const { error } = await supabaseErbi.from("tracking_tokens").insert({
      route_name: "ASPACE",
      passenger_id: passenger.id,
      passenger_name: passenger.name,
      token: generateToken(),
      is_active: true, // Tokens nacen activos por defecto
      phone_primary: phonePrimary,
      phone_requires_selection: requiresSelection,
    });

    if (error) {
      toast.error("Error al generar enlace");
      console.error(error);
    } else {
      toast.success(`Enlace generado para ${passenger.name}`);
      loadData();
    }
  };

  const generateForAll = async () => {
    setGenerating(true);
    const existingPassengerIds = new Set(tokens.map((t) => t.passenger_id));
    const toGenerate = aspacePassengers.filter((p) => !existingPassengerIds.has(p.id));

    if (toGenerate.length === 0) {
      toast.info("Todos los usuarios ya tienen enlace generado");
      setGenerating(false);
      return;
    }

    const inserts = toGenerate.map((p) => {
      let phonePrimary: string | null = null;
      let requiresSelection = false;

      if (p.contact_phone) {
        const phones = parsePhones(p.contact_phone);
        const mobiles = phones.filter((ph) => ph.isMobile);
        if (mobiles.length === 1) phonePrimary = mobiles[0].number;
        else if (mobiles.length > 1) requiresSelection = true;
      }

      return {
        route_name: "ASPACE",
        passenger_id: p.id,
        passenger_name: p.name,
        token: generateToken(),
        is_active: true,
        phone_primary: phonePrimary,
        phone_requires_selection: requiresSelection,
      };
    });

    const { error } = await supabaseErbi.from("tracking_tokens").insert(inserts);

    if (error) {
      toast.error("Error al generar enlaces masivos");
      console.error(error);
    } else {
      toast.success(`${inserts.length} enlaces generados y activados`);
      loadData();
    }
    setGenerating(false);
  };

  const toggleActive = async (tokenId: string, currentValue: boolean) => {
    const { error } = await supabaseErbi.from("tracking_tokens").update({ is_active: !currentValue }).eq("id", tokenId);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, is_active: !currentValue } : t)));
    }
  };

  const getTrackingUrl = (tkn: string) => {
    // Usar /t/TOKEN: en navegador normal, BrowserRouter lo muestra directamente
    // sin redirigir a hash. Así iOS puede capturar la URL limpia al instalar.
    // En modo standalone (PWA), main.tsx redirige a hash.
    const baseUrl = "https://companion-route-planner.lovable.app";
    return `${baseUrl}/t/${tkn}`;
  };

  const copyLink = (tkn: string) => {
    navigator.clipboard.writeText(getTrackingUrl(tkn));
    toast.success("Enlace copiado al portapapeles");
  };

  const openLink = (tkn: string) => {
    window.open(getTrackingUrl(tkn), "_blank");
  };

  const buildMessage = (passengerName: string | null, token: string) => {
    const url = getTrackingUrl(token);
    return `Hola, aquí tienes el enlace de seguimiento de la ruta ASPACE para ${passengerName}:\n\n${url}\n\nPodrás ver cuándo se acerca el autobús. Se actualiza automáticamente.`;
  };

  const sendVia = (mode: ShareMode, phone: string, t: TrackingToken) => {
    const cleaned = phone.replace(/\s+/g, "").replace(/[^0-9]/g, "");
    const fullPhone = cleaned.startsWith("34") ? cleaned : `34${cleaned}`;
    const message = buildMessage(t.passenger_name, t.token);

    if (mode === "whatsapp") {
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // SMS: usar window.location.href en vez de window.open para evitar
      // que el navegador pida email u abra pestaña incorrecta.
      // iOS usa "&body=" mientras Android/otros usan "?body="
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const separator = isIOS ? "&" : "?";
      const smsUrl = `sms:+${fullPhone}${separator}body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
    }
  };

  /** When only one phone, send directly. When multiple, handled by popover */
  const handleDirectSend = (mode: ShareMode, t: TrackingToken) => {
    if (!t.phone_primary) {
      toast.error("No hay teléfono móvil configurado");
      return;
    }
    sendVia(mode, t.phone_primary, t);
  };

  const selectPhoneAndSend = async (mode: ShareMode, phone: string, t: TrackingToken) => {
    // Save selected phone as primary
    await supabaseErbi
      .from("tracking_tokens")
      .update({ phone_primary: phone, phone_requires_selection: false })
      .eq("id", t.id);

    setTokens((prev) =>
      prev.map((tk) => (tk.id === t.id ? { ...tk, phone_primary: phone, phone_requires_selection: false } : tk)),
    );

    sendVia(mode, phone, t);
    toast.success("Teléfono guardado como principal");
  };


  if (!isAdmin) return null;

  const activeCount = tokens.filter((t) => t.is_active).length;
  const requiresAttention = tokens.filter((t) => t.phone_requires_selection).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Seguimiento ASPACE</h3>
          <p className="text-xs text-muted-foreground">
            {tokens.length} enlaces · {activeCount} activos
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            size="sm"
            onClick={generateForAll}
            disabled={generating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Users size={14} />
            Generar todos
          </Button>
        </div>
      </div>

      {requiresAttention > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 rounded-lg p-3 text-xs">
          <AlertTriangle size={14} />
          <span>{requiresAttention} usuario(s) requieren selección de teléfono móvil</span>
        </div>
      )}

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {/* Passengers without token yet */}
        {aspacePassengers
          .filter((p) => !tokens.find((t) => t.passenger_id === p.id))
          .map((p) => (
            <Card key={p.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">Sin enlace</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => generateForPassenger(p)}>
                  <Link2 size={14} />
                  Generar
                </Button>
              </CardContent>
            </Card>
          ))}

        {/* Tokens */}
        {tokens.map((t) => {
          const phones = getPhonesForToken(t);
          const mobilePhones = phones.filter((p) => p.isMobile);
          // If requires_selection but only 1 mobile, use all phones as fallback
          const availablePhones = mobilePhones.length > 0 ? mobilePhones : phones;
          const hasMultiplePhones = availablePhones.length > 1;
          // Show picker when requires_selection even with 1 phone
          const needsPicker = hasMultiplePhones || (t.phone_requires_selection && availablePhones.length >= 1);
          const hasPhone = !!t.phone_primary || availablePhones.length > 0;

          return (
            <Card
              key={t.id}
              className={`border ${t.is_active ? "border-green-500/30 bg-green-500/5" : "bg-card border-border"}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.passenger_name || "Sin nombre"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.is_active ? (
                        <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-600">
                          <Eye size={10} className="mr-1" /> Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          <EyeOff size={10} className="mr-1" /> Inactivo
                        </Badge>
                      )}
                      {t.phone_primary && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone size={9} /> {t.phone_primary}
                        </span>
                      )}
                      {t.phone_requires_selection && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle size={10} className="mr-1" /> Elegir teléfono
                        </Badge>
                      )}
                      {t.last_access_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Visto: {new Date(t.last_access_at).toLocaleDateString("es-ES")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {/* WhatsApp */}
                  {hasPhone && !needsPicker && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-green-500 hover:text-green-400 hover:bg-green-500/10"
                      onClick={() => handleDirectSend("whatsapp", t)}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </Button>
                  )}
                  {needsPicker && (
                    <PhonePickerButton phones={availablePhones} mode="whatsapp" token={t} onSelect={selectPhoneAndSend} />
                  )}

                  {/* SMS */}
                  {hasPhone && !needsPicker && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                      onClick={() => handleDirectSend("sms", t)}
                    >
                      <Smartphone size={12} /> SMS
                    </Button>
                  )}
                  {needsPicker && (
                    <PhonePickerButton phones={availablePhones} mode="sms" token={t} onSelect={selectPhoneAndSend} />
                  )}

                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyLink(t.token)}>
                    <Copy size={12} /> Copiar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openLink(t.token)}>
                    <ExternalLink size={12} /> Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Phone picker popover for tokens with multiple mobile numbers */
const PhonePickerButton = React.forwardRef<
  HTMLButtonElement,
  {
    phones: { label: string; number: string; isMobile: boolean }[];
    mode: ShareMode;
    token: TrackingToken;
    onSelect: (mode: ShareMode, phone: string, token: TrackingToken) => void;
  }
>(function PhonePickerButton({ phones, mode, token, onSelect }, _ref) {
  const [open, setOpen] = useState(false);
  const isWhatsApp = mode === "whatsapp";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={_ref}
          size="sm"
          variant="ghost"
          className={`h-7 text-xs ${
            isWhatsApp
              ? "text-green-500 hover:text-green-400 hover:bg-green-500/10"
              : "text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
          }`}
        >
          {isWhatsApp ? <MessageCircle size={12} /> : <Smartphone size={12} />}
          {isWhatsApp ? "WhatsApp" : "SMS"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Selecciona teléfono:</p>
        <div className="space-y-1">
          {phones.map((p, i) => (
            <Button
              key={i}
              size="sm"
              variant="ghost"
              className="w-full justify-start h-8 text-xs"
              onClick={() => {
                onSelect(mode, p.number, token);
                setOpen(false);
              }}
            >
              <Phone size={12} className="mr-2 shrink-0" />
              <span className="truncate">
                {p.label} · {p.number}
              </span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
PhonePickerButton.displayName = "PhonePickerButton";
