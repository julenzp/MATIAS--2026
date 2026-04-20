import { useState, memo, useMemo } from "react";
import { TripEntry, ScheduleSection, userContacts } from "@/data/scheduleData";
import { useSchedule, UserStatus } from "@/context/ScheduleContext";
import { Clock, MapPin, Phone, User, Check, X, RotateCcw, MessageCircle, Clock3, PenLine, Accessibility, MessageSquareWarning, Bus, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PassengerNote } from "@/hooks/usePassengerNotes";

type ScheduleTableProps = {
  section: ScheduleSection;
  variant: "morning" | "afternoon";
  passengerNotes?: PassengerNote[];
  routeCode?: string;
};

const TypeBadge = ({ type }: { type: 'S' | 'B' | '' }) => {
  if (!type) return null;
  
  if (type === 'S') {
    return (
      <Accessibility size={28} strokeWidth={2.5} className="text-red-500 drop-shadow-sm" />
    );
  }
  
  return (
    <span className="badge-b">
      {type}
    </span>
  );
};

const StatusBadge = ({ status }: { status: UserStatus }) => {
  if (status === "pending") return null;
  
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg shadow-sm">
        <Check size={14} />
        Presente
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 bg-red-500 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg shadow-sm">
      <X size={14} />
      Ausente
    </span>
  );
};

// Reusable Reset Button with confirmation dialog
const ResetButton = ({ 
  tripId, 
  userName, 
  resetUser,
  small = false 
}: { 
  tripId: string; 
  userName: string; 
  resetUser: (tripId: string) => void;
  small?: boolean;
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmReset = () => {
    resetUser(tripId);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={small ? "h-9 px-3" : "h-10 px-4"}
        onClick={() => setShowConfirm(true)}
        title="Berrezarri / Restablecer"
      >
        <RotateCcw size={16} className={small ? "mr-1" : "mr-2"} />
        {small ? <span className="text-xs">Reset</span> : "Reset"}
      </Button>

      {showConfirm && (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar anulación?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres anular el registro de asistencia de <strong>{userName}</strong>? 
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmReset}
                className="bg-red-500 hover:bg-red-600"
              >
                Anular
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

// Bus Stop Alert Button
const BusStopAlertButton = ({ userName, routeCode, contactPhone, small = false }: { userName: string; routeCode?: string; contactPhone?: string; small?: boolean }) => {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const openWhatsAppAlert = (phone: string) => {
    const message = `🚌 ¡¡EL AUTOBÚS DE ${userName.toUpperCase()} ESTÁ YA EN LA PARADA!! 🔴🔴🔴\n\n‼️ ¡¡ESTAMOS ESPERÁNDOTE!! ‼️`;
    const encodedMessage = encodeURIComponent(message);
    const link = document.createElement('a');
    link.href = `https://wa.me/34${phone}?text=${encodedMessage}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPhoneForWhatsApp = async (): Promise<string | null> => {
    // 1. Use provided contactPhone prop
    if (contactPhone) {
      const phone = extractPhoneNumber(contactPhone);
      if (phone) return phone;
    }
    // 2. Try userContacts static map
    const staticContact = userContacts[userName];
    if (staticContact) {
      const phone = extractPhoneNumber(staticContact);
      if (phone) return phone;
    }
    // 3. Query DB for passenger contact_phone
    const { data } = await supabase
      .rpc('get_passenger_contact_by_name', { p_name: userName });
    const firstResult = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (firstResult?.contact_phone) {
      const phone = extractPhoneNumber(firstResult.contact_phone);
      if (phone) return phone;
    }
    return null;
  };

  const handleSendAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sent || sending) return;
    setSending(true);
    try {
      const phone = await getPhoneForWhatsApp();
      if (phone) {
        openWhatsAppAlert(phone);
        toast.success(`📱 WhatsApp enviado a la familia de ${userName}`);
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      } else {
        toast.warning(`${userName}: sin teléfono de contacto guardado`, {
          description: "Añade un teléfono de contacto en la ficha del pasajero",
        });
        console.warn(`[BusAlert] No phone found for "${userName}". contactPhone prop:`, contactPhone);
      }
    } catch {
      toast.error("Error al enviar alerta");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      size="sm"
      className={`${small ? "h-9 px-2" : "h-10 px-3"} rounded-full shadow-md font-bold text-sm ${
        sent ? "bus-alert-btn-sent" : "bus-alert-btn"
      }`}
      onClick={handleSendAlert}
      disabled={sent || sending}
      title="Alerta bus en parada"
    >
      <Bus size={small ? 14 : 16} className="mr-0.5" />
      {sent ? "✓" : <BellRing size={small ? 10 : 12} />}
    </Button>
  );
};

const extractPhoneNumber = (contact?: string): string => {
  if (!contact) return '';
  const match = contact.match(/(\d[\d\s]{6,})/);
  return match ? match[1].replace(/\s/g, '') : '';
};

const WhatsAppMenu = ({ phone, userName }: { phone: string; userName: string }) => {
  const sendWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/34${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleCustomMessage = () => {
    const message = prompt("Mezu pertsonalizatua / Mensaje personalizado:");
    if (message) {
      sendWhatsApp(message);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors dark:bg-green-900/30 dark:text-green-400"
          title="WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 z-[9999] bg-popover shadow-lg border">
        <DropdownMenuItem onClick={handleCustomMessage} className="cursor-pointer">
          <PenLine size={16} className="mr-2" />
          <span>Mezu pertsonalizatua / Personalizado</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => sendWhatsApp(`Kaixo ${userName}, 10 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 10 minutos.`)}
          className="cursor-pointer"
        >
          <Clock3 size={16} className="mr-2 text-amber-500" />
          <span>10 minutuko atzerapena / 10 min retraso</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => sendWhatsApp(`Kaixo ${userName}, 20 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 20 minutos.`)}
          className="cursor-pointer"
        >
          <Clock3 size={16} className="mr-2 text-red-500" />
          <span>20 minutuko atzerapena / 20 min retraso</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ContactActions = ({ userName }: { userName: string }) => {
  const contact = userContacts[userName];
  const phone = extractPhoneNumber(contact);
  
  if (!phone) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  return (
    <div className="flex items-center gap-1">
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        title="Deitu / Llamar"
      >
        <Phone size={16} />
      </a>
      <WhatsAppMenu phone={phone} userName={userName} />
    </div>
  );
};

// Mobile Card View
const UserCard = ({ trip, note, routeCode }: { trip: TripEntry; note?: PassengerNote; routeCode?: string }) => {
  const { selectUser, markAbsent, resetUser, getSelection, getPresentTimestamp } = useSchedule();
  const selection = getSelection(trip.id);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showLateDialog, setShowLateDialog] = useState(false);
  const [lateMinutes, setLateMinutes] = useState("");
  const isAspace = routeCode === "ASPACE";

  const handleLateAutoClick = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Try stored timestamp first, then fall back to scheduled time comparison
    const presentTs = getPresentTimestamp(trip.id);
    let elapsedMin: number;
    
    if (presentTs) {
      const elapsedMs = Date.now() - presentTs;
      elapsedMin = Math.max(1, Math.round(elapsedMs / 60000));
    } else {
      // Fallback: calculate from scheduled time
      const [schedH, schedM] = trip.time.split(':').map(Number);
      const schedTotalMin = schedH * 60 + schedM;
      const nowTotalMin = now.getHours() * 60 + now.getMinutes();
      elapsedMin = Math.max(1, nowTotalMin - schedTotalMin);
    }
    
    selectUser(trip.id, trip.user, trip.time, routeCode, `${currentTime} (T+${elapsedMin}min)`);
  };

  const handleLateManualConfirm = () => {
    const mins = lateMinutes.trim();
    if (!mins) return;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    selectUser(trip.id, trip.user, trip.time, routeCode, `${currentTime} (T+${mins}min)`);
    setShowLateDialog(false);
    setLateMinutes("");
  };
  
  const isLate = selection.status === "present" && selection.actualTime?.includes('T+');
  const hasWaitTime = selection.status === "absent" && selection.actualTime?.includes('E+');

  const getCardClass = () => {
    if (selection.status === "present" && isLate) {
      return "bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-700";
    }
    if (selection.status === "present") {
      return "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800";
    }
    if (selection.status === "absent") {
      return "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800";
    }
    // Highlight card if has note
    if (note) {
      return "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700";
    }
    return "bg-card border-border";
  };

  const formattedDate = note ? new Date(note.created_at).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <>
      <div className={`${getCardClass()} border-2 rounded-xl p-3 space-y-2 ${isLate ? 'ring-2 ring-amber-500' : ''} ${note && !isLate ? 'ring-[3px] ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : ''}`}>
        {/* Header: Time + Name + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xl text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
              {trip.time}
            </span>
            {trip.registrationNumber && (
              <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold bg-primary/20 text-primary rounded-full border border-primary/30">
                {trip.registrationNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {note && (
              <MessageSquareWarning 
                size={28} 
                className="text-amber-500 animate-pulse cursor-pointer drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" 
                onClick={() => setShowNoteDialog(true)}
              />
            )}
            <TypeBadge type={trip.type} />
            <StatusBadge status={selection.status} />
          </div>
        </div>
        
        {/* Name + Location */}
        <div className="space-y-0.5">
          <button 
            onClick={() => note && setShowNoteDialog(true)}
            className={`text-base font-bold text-left w-full leading-tight ${isLate ? "text-amber-700" : selection.status === "present" ? "text-green-700" : selection.status === "absent" ? "text-red-600 line-through" : "text-foreground"} ${note ? 'underline decoration-amber-500 decoration-[3px] underline-offset-4 cursor-pointer hover:text-amber-600' : ''}`}
          >
            {trip.user}
          </button>
          {trip.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 font-medium">
              <MapPin size={13} />
              {trip.location}
            </p>
          )}
        </div>
        
        {selection.actualTime && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`inline-flex items-center gap-1 sm:gap-1.5 font-mono font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow ${hasWaitTime ? 'bg-red-500 text-white' : isLate ? 'bg-amber-400 text-amber-900' : selection.status === 'absent' ? 'bg-red-400 text-white' : 'bg-green-500 text-white'}`}>
              <Clock size={13} className="sm:w-[15px] sm:h-[15px]" />
              <span className="hidden sm:inline text-xs opacity-80">Hora:</span>
              <span className="text-base sm:text-xl tracking-wider">
                {selection.actualTime.includes('(T+') || selection.actualTime.includes('(E+')
                  ? selection.actualTime.split('(')[0].trim()
                  : selection.actualTime
                }
              </span>
              {selection.actualTime.includes('(T+') && (
                <span className="text-[10px] sm:text-xs font-bold text-red-700 bg-white px-1 sm:px-1.5 py-0.5 rounded ml-0.5 sm:ml-1">
                  {selection.actualTime.match(/\(T\+.*\)/)?.[0]}
                </span>
              )}
              {selection.actualTime.includes('(E+') && (
                <span className="text-[10px] sm:text-xs font-bold text-red-900 bg-red-100 px-1 sm:px-1.5 py-0.5 rounded ml-0.5 sm:ml-1">
                  {selection.actualTime.match(/\(E\+.*\)/)?.[0]}
                </span>
              )}
            </div>
            {selection.status === "present" && !selection.actualTime?.includes('T+') && (
              <Button
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 bg-foreground hover:bg-foreground/80 text-background rounded-full shadow text-sm sm:text-sm font-bold"
                onClick={handleLateAutoClick}
                title="Tarde (automático)"
              >
                T
              </Button>
            )}
            {selection.status === "present" && (
              <Button
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow"
                onClick={() => markAbsent(trip.id, trip.user, trip.time, routeCode)}
                title="No ha venido / Ez da etorri"
              >
                <X size={18} strokeWidth={3} />
              </Button>
            )}
            {routeCode === "ASPACE" && <BusStopAlertButton userName={trip.user} routeCode={routeCode} contactPhone={trip.contact} small />}
            <ResetButton 
              tripId={trip.id} 
              userName={trip.user} 
              resetUser={resetUser}
              small
            />
          </div>
        )}
        
        {/* Actions - solo para pendientes */}
        {selection.status === "pending" && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              {routeCode === "ASPACE" && <BusStopAlertButton userName={trip.user} routeCode={routeCode} contactPhone={trip.contact} small />}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-11 w-11 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full shadow border-2 border-green-600"
                onClick={() => selectUser(trip.id, trip.user, trip.time, routeCode)}
              >
                <Check size={22} strokeWidth={3} />
              </Button>
              <Button
                size="sm"
                className="h-11 w-11 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow border-2 border-red-600"
                onClick={() => markAbsent(trip.id, trip.user, trip.time, routeCode)}
              >
                <X size={22} strokeWidth={3} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Note Dialog - only mount when open */}
      {note && showNoteDialog && (
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <MessageSquareWarning size={20} />
                Abisua / Aviso - {trip.user}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {formattedDate}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-2">
              <p className="text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                {note.message}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Late Dialog - only mount when open */}
      {showLateDialog && (
        <AlertDialog open={showLateDialog} onOpenChange={setShowLateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tarde / Berandu - {trip.user}</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Cuántos minutos de retraso? / Zenbat minutuko atzerapena?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <input
                type="number"
                min="1"
                max="120"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(e.target.value)}
                placeholder="Minutuak / Minutos"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setLateMinutes(""); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLateManualConfirm}
                className="bg-black hover:bg-gray-800 text-white"
                disabled={!lateMinutes.trim()}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

// Desktop Table Row
const UserRow = ({ trip, index, note, routeCode, className = '' }: { trip: TripEntry; index: number; note?: PassengerNote; routeCode?: string; className?: string }) => {
  const { selectUser, markAbsent, resetUser, getSelection, getPresentTimestamp } = useSchedule();
  const selection = getSelection(trip.id);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showLateDialog, setShowLateDialog] = useState(false);
  const [lateMinutes, setLateMinutes] = useState("");
  const isAspace = routeCode === "ASPACE";

  const handleLateAutoClick = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const presentTs = getPresentTimestamp(trip.id);
    let elapsedMin: number;
    
    if (presentTs) {
      const elapsedMs = Date.now() - presentTs;
      elapsedMin = Math.max(1, Math.round(elapsedMs / 60000));
    } else {
      const [schedH, schedM] = trip.time.split(':').map(Number);
      const schedTotalMin = schedH * 60 + schedM;
      const nowTotalMin = now.getHours() * 60 + now.getMinutes();
      elapsedMin = Math.max(1, nowTotalMin - schedTotalMin);
    }
    
    selectUser(trip.id, trip.user, trip.time, routeCode, `${currentTime} (T+${elapsedMin}min)`);
  };

  const handleLateManualConfirm = () => {
    const mins = lateMinutes.trim();
    if (!mins) return;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    selectUser(trip.id, trip.user, trip.time, routeCode, `${currentTime} (T+${mins}min)`);
    setShowLateDialog(false);
    setLateMinutes("");
  };
  
  const isLate = selection.status === "present" && selection.actualTime?.includes('T+');
  const hasWaitTime = selection.status === "absent" && selection.actualTime?.includes('E+');

  const getRowClass = () => {
    const baseClass = index % 2 === 0 ? 'schedule-row-even' : 'schedule-row-odd';
    
    if (selection.status === "present" && isLate) {
      return `${baseClass} bg-amber-50 dark:bg-amber-950/30`;
    }
    if (selection.status === "present") {
      return `${baseClass} bg-green-50 dark:bg-green-950/30`;
    }
    if (selection.status === "absent") {
      return `${baseClass} bg-red-50 dark:bg-red-950/30`;
    }
    if (note) {
      return `${baseClass} bg-amber-50 dark:bg-amber-950/30`;
    }
    return baseClass;
  };
  
  const getUserNameClass = () => {
    if (selection.status === "present" && isLate) {
      return "font-bold text-amber-700 dark:text-amber-400";
    }
    if (selection.status === "present") {
      return "font-semibold text-green-600 dark:text-green-400";
    }
    if (selection.status === "absent") {
      return "font-semibold text-red-600 dark:text-red-400 line-through";
    }
    if (note) {
      return "font-bold underline decoration-amber-500 decoration-[3px] underline-offset-4";
    }
    return "font-medium";
  };

  const formattedDate = note ? new Date(note.created_at).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <>
      <tr className={`${getRowClass()} hover:bg-muted/50 transition-colors ${note ? 'ring-2 ring-inset ring-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]' : ''} ${className}`}>
        <td className="schedule-cell">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-bold text-primary text-base">{trip.time}</span>
            {selection.actualTime && (
              <div className={`inline-flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg shadow-md ${
                hasWaitTime
                  ? "bg-red-500 text-white"
                  : isLate
                    ? "bg-amber-400 text-amber-900"
                    : selection.status === "present" 
                      ? "bg-green-500 text-black" 
                      : "bg-red-500 text-black"
              }`}>
                <span className="text-xs opacity-70">→</span>
                <span className="text-lg tracking-wider">
                  {selection.actualTime.includes('(T+') || selection.actualTime.includes('(E+')
                    ? selection.actualTime.split('(')[0].trim()
                    : selection.actualTime
                  }
                </span>
                {selection.actualTime.includes('(T+') && (
                  <span className="text-xs font-bold text-red-600 bg-white/90 px-1 py-0.5 rounded ml-1">
                    {selection.actualTime.match(/\(T\+.*\)/)?.[0]}
                  </span>
                )}
                {selection.actualTime.includes('(E+') && (
                  <span className="text-xs font-bold text-white bg-red-700 px-1 py-0.5 rounded ml-1">
                    {selection.actualTime.match(/\(E\+.*\)/)?.[0]}
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
        <td className="schedule-cell">
          <div className="flex items-center gap-2">
            {trip.registrationNumber && (
              <span className="inline-flex items-center justify-center min-w-6 h-6 text-xs font-bold bg-primary/20 text-primary rounded-full">
                {trip.registrationNumber}
              </span>
            )}
            {note && (
              <MessageSquareWarning 
                size={24} 
                className="text-amber-500 animate-pulse cursor-pointer shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" 
                onClick={() => setShowNoteDialog(true)}
              />
            )}
            <button 
              onClick={() => note && setShowNoteDialog(true)}
              className={`${getUserNameClass()} ${note ? 'cursor-pointer hover:text-amber-600' : ''}`}
            >
              {trip.user}
            </button>
            <StatusBadge status={selection.status} />
          </div>
        </td>
        <td className="schedule-cell text-muted-foreground">
          {trip.location || "—"}
        </td>
        <td className="schedule-cell text-center">
          <TypeBadge type={trip.type} />
        </td>
        <td className="schedule-cell">
          <ContactActions userName={trip.user} />
        </td>
        <td className="schedule-cell">
          <div className="flex items-center gap-2">
            {selection.status === "pending" && (
              <>
                {routeCode === "ASPACE" && <BusStopAlertButton userName={trip.user} routeCode={routeCode} contactPhone={trip.contact} small />}
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md"
                  onClick={() => selectUser(trip.id, trip.user, trip.time, routeCode)}
                  title="Presente / Bertaratu"
                >
                  <Check size={22} strokeWidth={3} />
                </Button>
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md"
                  onClick={() => markAbsent(trip.id, trip.user, trip.time, routeCode)}
                  title="Ausente / Ez dator"
                >
                  <X size={22} strokeWidth={3} />
                </Button>
              </>
            )}
            {selection.status !== "pending" && (
              <div className="flex items-center gap-2">
                {selection.status === "present" && !selection.actualTime?.includes('T+') && (
                  <Button
                    size="sm"
                    className="h-10 w-10 p-0 bg-black hover:bg-gray-800 text-white rounded-full shadow-md text-lg font-bold"
                    onClick={handleLateAutoClick}
                    title="Tarde / Berandu (automático)"
                  >
                    T
                  </Button>
                )}
                {selection.status === "present" && (
                  <Button
                    size="sm"
                    className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md"
                    onClick={() => markAbsent(trip.id, trip.user, trip.time, routeCode)}
                    title="No ha venido / Ez da etorri"
                  >
                    <X size={20} strokeWidth={3} />
                  </Button>
                )}
                {routeCode === "ASPACE" && <BusStopAlertButton userName={trip.user} routeCode={routeCode} contactPhone={trip.contact} small />}
                <ResetButton 
                  tripId={trip.id}
                  userName={trip.user} 
                  resetUser={resetUser}
                  small
                />
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Note Dialog - only mount when open */}
      {note && showNoteDialog && (
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <MessageSquareWarning size={20} />
                Abisua / Aviso - {trip.user}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {formattedDate}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-2">
              <p className="text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                {note.message}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Late Dialog - only mount when open */}
      {showLateDialog && (
        <AlertDialog open={showLateDialog} onOpenChange={setShowLateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tarde / Berandu - {trip.user}</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Cuántos minutos de retraso? / Zenbat minutuko atzerapena?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <input
                type="number"
                min="1"
                max="120"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(e.target.value)}
                placeholder="Minutuak / Minutos"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setLateMinutes(""); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLateManualConfirm}
                className="bg-black hover:bg-gray-800 text-white"
                disabled={!lateMinutes.trim()}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

// Check if a trip is a ZENTRO marker (not a real passenger)
const isZentroMarker = (trip: TripEntry): boolean => {
  return trip.user.toUpperCase().includes('ZENTRO');
};

// Filter out ZENTRO markers from trips for display
const filterRealPassengers = (trips: TripEntry[]): TripEntry[] => {
  return trips.filter(trip => !isZentroMarker(trip));
};

// Calculate arrival time - use ZENTRO's time if it exists, otherwise last trip + 10 min
const calculateArrivalTime = (trips: TripEntry[]): string => {
  if (trips.length === 0) return '--:--';
  
  // Look for ZENTRO entry and use its time directly
  const zentroEntry = trips.find(trip => isZentroMarker(trip));
  if (zentroEntry) {
    return zentroEntry.time;
  }
  
  // Fallback: last trip time + 10 minutes
  const realTrips = filterRealPassengers(trips);
  if (realTrips.length === 0) return '--:--';
  const lastTrip = realTrips[realTrips.length - 1];
  const [hours, minutes] = lastTrip.time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + 10;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${newHours}:${newMinutes.toString().padStart(2, '0')}`;
};

// Calculate departure time (first trip time - 10 minutes)
const calculateDepartureTime = (trips: TripEntry[]): string => {
  if (trips.length === 0) return '--:--';
  const firstTrip = trips[0];
  const [hours, minutes] = firstTrip.time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes - 10;
  if (totalMinutes < 0) totalMinutes = 0;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${newHours}:${newMinutes.toString().padStart(2, '0')}`;
};

// Arrival Row Component for Desktop
const ArrivalRow = ({ arrivalTime, sectionId, routeCode }: { arrivalTime: string; sectionId: string; routeCode: string }) => {
  const { selectUser, markAbsent, resetUser, getSelection } = useSchedule();
  const arrivalId = `${sectionId}-arrival`;
  const selection = getSelection(arrivalId);
  
  const getRowClass = () => {
    if (selection.status === "present") {
      return "bg-green-100 dark:bg-green-950/40";
    }
    if (selection.status === "absent") {
      return "bg-red-100 dark:bg-red-950/40";
    }
    return "bg-primary/10 dark:bg-primary/20";
  };
  
  return (
    <tr className={`${getRowClass()} border-t-2 border-primary/30`}>
      <td className="schedule-cell">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-bold text-lg text-primary">{arrivalTime}</span>
          {selection.actualTime && (
            <div className={`inline-flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg shadow-md ${
              selection.status === "present" 
                ? "bg-green-500 text-black" 
                : "bg-red-500 text-black"
            }`}>
              <span className="text-xs opacity-70">→</span>
              <span className="text-lg tracking-wider">{selection.actualTime}</span>
            </div>
          )}
        </div>
      </td>
      <td className="schedule-cell" colSpan={4}>
        <div className="flex items-center gap-2 font-semibold text-primary">
          <MapPin size={16} />
          <span>Zentrora iritsi / Llegada al centro</span>
          {selection.status === "present" && (
            <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              <Check size={12} />
            </span>
          )}
          {selection.status === "absent" && (
            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              <X size={12} />
            </span>
          )}
        </div>
      </td>
      <td className="schedule-cell">
        <div className="flex items-center gap-2">
          {selection.status === "pending" && (
            <>
              <Button
                size="sm"
                className="h-10 w-10 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md"
                onClick={() => selectUser(arrivalId, "Llegada al centro", arrivalTime, routeCode)}
                title="Registrar llegada"
              >
                <Check size={22} strokeWidth={3} />
              </Button>
              <Button
                size="sm"
                className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md"
                onClick={() => markAbsent(arrivalId, "Llegada al centro", arrivalTime, routeCode)}
                title="Marcar retraso"
              >
                <X size={22} strokeWidth={3} />
              </Button>
            </>
          )}
          {selection.status !== "pending" && (
            <ResetButton 
              tripId={arrivalId} 
              userName="Llegada al centro" 
              resetUser={resetUser}
              small
            />
          )}
        </div>
      </td>
    </tr>
  );
};

// Arrival Card Component for Mobile
const ArrivalCard = ({ arrivalTime, sectionId, routeCode }: { arrivalTime: string; sectionId: string; routeCode: string }) => {
  const { selectUser, markAbsent, resetUser, getSelection } = useSchedule();
  const arrivalId = `${sectionId}-arrival`;
  const selection = getSelection(arrivalId);
  
  const getCardClass = () => {
    if (selection.status === "present") {
      return "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800";
    }
    if (selection.status === "absent") {
      return "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800";
    }
    return "bg-primary/10 border-primary/30 dark:bg-primary/20";
  };
  
  return (
    <div className={`${getCardClass()} border-2 rounded-lg p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-lg text-primary bg-primary/20 px-3 py-1 rounded">
            {arrivalTime}
          </span>
          <MapPin size={20} className="text-primary" />
        </div>
        {selection.status === "present" && (
          <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
            <Check size={12} />
          </span>
        )}
        {selection.status === "absent" && (
          <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            <X size={12} />
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="font-semibold text-primary">Zentrora iritsi / Llegada al centro</p>
      </div>
      
      {selection.actualTime && (
        <div className={`inline-flex items-center gap-2 font-mono font-bold px-4 py-2 rounded-lg shadow-lg ${
          selection.status === "present" 
            ? "bg-green-500 text-black" 
            : "bg-red-500 text-black"
        }`}>
          <Clock size={18} />
          <span className="hidden sm:inline text-xs opacity-70">Hora:</span>
          <span className="text-xl tracking-wider">{selection.actualTime}</span>
        </div>
      )}
      
      <div className="flex items-center justify-end pt-2 border-t border-border/50">
        <div className="flex items-center gap-3">
          {selection.status === "pending" ? (
            <>
              <Button
                size="lg"
                className="h-14 w-14 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg"
                onClick={() => selectUser(arrivalId, "Llegada al centro", arrivalTime, routeCode)}
              >
                <Check size={28} strokeWidth={3} />
              </Button>
              <Button
                size="lg"
                className="h-14 w-14 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                onClick={() => markAbsent(arrivalId, "Llegada al centro", arrivalTime, routeCode)}
              >
                <X size={28} strokeWidth={3} />
              </Button>
            </>
          ) : (
            <ResetButton 
              tripId={arrivalId} 
              userName="Llegada al centro" 
              resetUser={resetUser} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const ScheduleTable = memo(({ section, variant, passengerNotes = [], routeCode = '' }: ScheduleTableProps) => {
  const headerColor = variant === "morning" ? "bg-primary" : "bg-secondary";
  const arrivalTime = calculateArrivalTime(section.trips);
  const departureTime = calculateDepartureTime(section.trips);
  const showArrival = variant === "morning";
  const showDeparture = variant === "afternoon";
  
  // Build a Map for O(1) note lookups instead of O(n) .find() per trip
  const notesByPassengerId = useMemo(() => {
    const map = new Map<string, typeof passengerNotes[0]>();
    for (const n of passengerNotes) {
      map.set(n.passenger_id, n);
    }
    return map;
  }, [passengerNotes]);
  
  // Filter out ZENTRO markers - only show real passengers
  const displayTrips = useMemo(() => filterRealPassengers(section.trips), [section.trips]);
  
  // Generate a unique section ID based on route + title - normalize to remove accents and special chars
  const routePrefix = routeCode
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const titlePart = section.titleEs
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Combine route + title for unique section ID across routes
  const sectionId = routePrefix ? `${routePrefix}-${titlePart}` : titlePart;

  // Helper to find note for a trip's passenger (uses memoized Map)
  const getNoteForTrip = (trip: TripEntry): typeof passengerNotes[0] | undefined => {
    if (!trip.passengerId) return undefined;
    return notesByPassengerId.get(trip.passengerId);
  };
  
  return (
    <div className="rounded-2xl overflow-hidden shadow-md border-2 border-border animate-fade-in">
      <div className={`${headerColor} text-primary-foreground px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-2xl">{section.titleEu}</h3>
            <p className="text-base opacity-90 font-medium">{section.titleEs}</p>
          </div>
          {showArrival && (
            <div className="flex items-center gap-2 bg-white/25 px-4 py-2 rounded-xl border border-white/30">
              <MapPin size={18} />
              <span className="text-base font-semibold">Zentrora / Centro:</span>
              <span className="font-mono font-extrabold text-2xl">{arrivalTime}</span>
            </div>
          )}
          {showDeparture && (
            <div className="flex items-center gap-2 bg-white/25 px-4 py-2 rounded-xl border border-white/30">
              <Clock size={18} />
              <span className="text-base font-semibold">Irteera / Salida:</span>
              <span className="font-mono font-extrabold text-2xl">{departureTime}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden p-3 space-y-3 bg-muted/30">
        {(() => {
          // Group consecutive trips by same TIME + same LOCATION
          const groups: { key: string; trips: TripEntry[] }[] = [];
          displayTrips.forEach((trip) => {
            const time = (trip.time || '').trim();
            const loc = (trip.location || '').trim().toLowerCase();
            const key = `${time}|${loc}`;
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && time && loc && lastGroup.key === key) {
              lastGroup.trips.push(trip);
            } else {
              groups.push({ key, trips: [trip] });
            }
          });

          return groups.map((group, gi) => {
            if (group.trips.length >= 2) {
              const locationLabel = group.trips[0].location || group.trips[0].time;
              return (
                <div key={`group-${gi}`} className="rounded-xl border-2 border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-950/20 p-2 space-y-2">
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5">
                    <MapPin size={14} className="text-green-600" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">{locationLabel}</span>
                    <span className="text-xs text-green-500 dark:text-green-500">({group.trips.length} usuarios)</span>
                  </div>
                  {group.trips.map((trip) => {
                    const note = trip.passengerId ? notesByPassengerId.get(trip.passengerId) : undefined;
                    return <UserCard key={trip.id} trip={trip} note={note} routeCode={routeCode} />;
                  })}
                </div>
              );
            }
            const trip = group.trips[0];
            const note = trip.passengerId ? notesByPassengerId.get(trip.passengerId) : undefined;
            return <UserCard key={trip.id} trip={trip} note={note} routeCode={routeCode} />;
          });
        })()}
        {showArrival && <ArrivalCard arrivalTime={arrivalTime} sectionId={sectionId} routeCode={routeCode} />}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="schedule-table">
          <thead>
            <tr className="bg-header text-header-foreground">
              <th className="schedule-header w-24">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Ordua / Hora
                </div>
              </th>
              <th className="schedule-header">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  Erabiltzailea / Usuario
                </div>
              </th>
              <th className="schedule-header">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  Kokalekua / Ubicación
                </div>
              </th>
              <th className="schedule-header w-14 text-center">S/B</th>
              <th className="schedule-header w-24 text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Phone size={14} />
                </div>
              </th>
              <th className="schedule-header w-28 text-center">
                Ekintzak / Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Group by same TIME + same LOCATION for desktop
              const locGroups: { key: string; startIdx: number; count: number }[] = [];
              displayTrips.forEach((trip, idx) => {
                const time = (trip.time || '').trim();
                const loc = (trip.location || '').trim().toLowerCase();
                const key = `${time}|${loc}`;
                const lastGroup = locGroups[locGroups.length - 1];
                if (lastGroup && time && loc && lastGroup.key === key) {
                  lastGroup.count++;
                } else {
                  locGroups.push({ key, startIdx: idx, count: 1 });
                }
              });

              const groupInfo = new Map<number, { isFirst: boolean; isLast: boolean; isGrouped: boolean }>();
              locGroups.forEach(g => {
                if (g.count >= 2) {
                  for (let i = g.startIdx; i < g.startIdx + g.count; i++) {
                    groupInfo.set(i, {
                      isFirst: i === g.startIdx,
                      isLast: i === g.startIdx + g.count - 1,
                      isGrouped: true,
                    });
                  }
                }
              });

              return displayTrips.map((trip, index) => {
                const note = trip.passengerId ? notesByPassengerId.get(trip.passengerId) : undefined;
                const info = groupInfo.get(index);
                const groupClass = info?.isGrouped
                  ? `${info.isFirst ? 'border-t-2 border-t-green-400 dark:border-t-green-600' : ''} ${info.isLast ? 'border-b-2 border-b-green-400 dark:border-b-green-600' : ''} bg-green-50/40 dark:bg-green-950/15`
                  : '';
                return <UserRow key={trip.id} trip={trip} index={index} note={note} routeCode={routeCode} className={groupClass} />;
              });
            })()}
            {showArrival && <ArrivalRow arrivalTime={arrivalTime} sectionId={sectionId} routeCode={routeCode} />}
          </tbody>
        </table>
      </div>
    </div>
  );
});
