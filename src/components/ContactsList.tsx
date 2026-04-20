import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Phone, MessageCircle, User, PenLine, Clock3, Loader2, ChevronDown, X } from "lucide-react";
import { WhatsAppBulkSender } from "./WhatsAppBulkSender";
import { supabase } from "@/integrations/supabase/client";
import { getRouteDisplayName } from "@/lib/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type Passenger = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  route: string;
};

// Extrae todos los números de teléfono de un string
const extractAllPhoneNumbers = (contact: string): { number: string; label: string }[] => {
  const phones: { number: string; label: string }[] = [];
  
  // Buscar patrones como "Móvil: 666123456" o "Tel: 943123456"
  const labeledPattern = /(Móvil|Movil|Tel|Teléfono|Telefono|Fijo|Casa|Trabajo)[:\s]*(\d[\d\s]{6,})/gi;
  let match;
  
  while ((match = labeledPattern.exec(contact)) !== null) {
    const label = match[1];
    const number = match[2].replace(/\s/g, '');
    phones.push({ number, label });
  }
  
  // Si no encontramos con etiquetas, buscar todos los números
  if (phones.length === 0) {
    const numberPattern = /(\d[\d\s]{6,})/g;
    let index = 1;
    while ((match = numberPattern.exec(contact)) !== null) {
      const number = match[1].replace(/\s/g, '');
      // Intentar determinar si es móvil o fijo por el prefijo
      const isMobile = number.startsWith('6') || number.startsWith('7');
      const label = phones.length === 0 ? (isMobile ? 'Móvil' : 'Teléfono') : 
                    (isMobile ? `Móvil ${index}` : `Teléfono ${index}`);
      phones.push({ number, label });
      index++;
    }
  }
  
  return phones;
};

// Componente para seleccionar teléfono cuando hay múltiples
const PhoneSelector = ({ 
  phones, 
  onSelect, 
  type 
}: { 
  phones: { number: string; label: string }[];
  onSelect: (phone: string) => void;
  type: 'call' | 'whatsapp';
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-full transition-colors active:scale-95 ${
            type === 'call' 
              ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
              : 'bg-green-100 text-green-600 hover:bg-green-500 hover:text-white dark:bg-green-900/30 dark:text-green-400'
          }`}
          title={type === 'call' ? 'Deitu / Llamar' : 'WhatsApp'}
        >
          {type === 'call' ? <Phone size={18} /> : <MessageCircle size={18} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-popover z-50">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {type === 'call' ? 'Aukeratu zenbakia / Elige número' : 'Aukeratu zenbakia / Elige número'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {phones.map((phone, idx) => (
          <DropdownMenuItem 
            key={idx}
            onClick={() => onSelect(phone.number)}
            className="cursor-pointer"
          >
            <Phone size={14} className="mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">{phone.label}</span>
              <span className="text-xs text-muted-foreground">{phone.number}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const WhatsAppMenu = ({ phone, userName }: { phone: string; userName: string }) => {
  const [open, setOpen] = useState(false);

  const sendWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const a = document.createElement("a");
    a.href = `https://wa.me/34${phone}?text=${encodedMessage}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  };

  const handleCustomMessage = () => {
    setOpen(false);
    setTimeout(() => {
      const message = prompt("Mezu pertsonalizatua / Mensaje personalizado:");
      if (message) {
        sendWhatsApp(message);
      }
    }, 100);
  };

  const options = [
    { label: "Mezu pertsonalizatua / Personalizado", icon: <PenLine size={18} className="shrink-0" />, action: handleCustomMessage },
    { label: "10 min atzerapena / 10 min retraso", icon: <Clock3 size={18} className="text-amber-500 shrink-0" />, action: () => sendWhatsApp(`Kaixo ${userName}, 10 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 10 minutos.`) },
    { label: "20 min atzerapena / 20 min retraso", icon: <Clock3 size={18} className="text-red-500 shrink-0" />, action: () => sendWhatsApp(`Kaixo ${userName}, 20 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 20 minutos.`) },
  ];

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors dark:bg-green-900/30 dark:text-green-400 active:scale-95"
        title="WhatsApp"
      >
        <MessageCircle size={18} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div 
            className="relative w-full sm:w-80 bg-popover border border-border rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">📱 WhatsApp — {userName}</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <div className="py-2">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={opt.action}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  {opt.icon}
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// Componente combinado para WhatsApp con selección de teléfono
const WhatsAppWithPhoneSelector = ({ 
  phones, 
  userName 
}: { 
  phones: { number: string; label: string }[];
  userName: string;
}) => {
  const [open, setOpen] = useState(false);

  const sendWhatsApp = (phone: string, message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const a = document.createElement("a");
    a.href = `https://wa.me/34${phone}?text=${encodedMessage}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  };

  const handleCustomMessage = (phone: string) => {
    setOpen(false);
    setTimeout(() => {
      const message = prompt("Mezu pertsonalizatua / Mensaje personalizado:");
      if (message) {
        sendWhatsApp(phone, message);
      }
    }, 100);
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors dark:bg-green-900/30 dark:text-green-400 active:scale-95"
        title="WhatsApp"
      >
        <MessageCircle size={18} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div 
            className="relative w-full sm:w-80 bg-popover border border-border rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-border bg-popover">
              <span className="font-semibold text-sm">📱 WhatsApp — {userName}</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <div className="py-2">
              {phones.map((phone, idx) => (
                <div key={idx}>
                  {idx > 0 && <div className="border-t border-border my-1" />}
                  <div className="px-4 py-2 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Phone size={12} />
                    {phone.label}: {phone.number}
                  </div>
                  <button onClick={() => handleCustomMessage(phone.number)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted active:bg-muted/80 transition-colors">
                    <PenLine size={18} className="shrink-0" />
                    <span className="text-sm font-medium">Personalizado</span>
                  </button>
                  <button onClick={() => sendWhatsApp(phone.number, `Kaixo ${userName}, 10 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 10 minutos.`)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted active:bg-muted/80 transition-colors">
                    <Clock3 size={18} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-medium">10 min retraso</span>
                  </button>
                  <button onClick={() => sendWhatsApp(phone.number, `Kaixo ${userName}, 20 minutuko atzerapena daukagu. / Hola ${userName}, tenemos un retraso de 20 minutos.`)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted active:bg-muted/80 transition-colors">
                    <Clock3 size={18} className="text-red-500 shrink-0" />
                    <span className="text-sm font-medium">20 min retraso</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

interface ContactsListProps {
  fixedRoute: string;
}

export const ContactsList = ({ fixedRoute }: ContactsListProps) => {
  const currentRoute = fixedRoute;
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassengers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_passenger_contacts', { p_route: currentRoute });

      if (!error && data) {
        setPassengers(data);
      }
      setLoading(false);
    };

    fetchPassengers();
  }, [currentRoute]);

  const contactsWithPhone = passengers.filter(p => p.contact_phone);

  // Extract first valid phone for bulk sender - must be before early returns
  const bulkContacts = useMemo(() => {
    return contactsWithPhone
      .map(p => {
        const phones = extractAllPhoneNumbers(p.contact_phone || '');
        if (phones.length === 0) return null;
        return { id: p.id, name: p.name, phone: phones[0].number };
      })
      .filter(Boolean) as { id: string; name: string; phone: string }[];
  }, [contactsWithPhone, currentRoute]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (contactsWithPhone.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>No hay contactos configurados para esta ruta.</p>
      </div>
    );
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:+34${phone}`;
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 animate-fade-in">
      {/* Bulk WhatsApp sender + Share contacts */}
      {bulkContacts.length > 0 && (
        <div className="mb-4 flex justify-end">
          <WhatsAppBulkSender contacts={bulkContacts} routeCode={currentRoute} />
        </div>
      )}

      <div className="rounded-lg overflow-hidden shadow-lg border border-border">
        <div className="bg-primary text-primary-foreground px-3 sm:px-4 py-3">
          <h3 className="font-semibold text-base sm:text-lg">Kontaktuen zerrenda</h3>
          <p className="text-xs sm:text-sm opacity-90">Lista de contactos - {getRouteDisplayName(currentRoute)}</p>
        </div>
        
        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-border">
          {contactsWithPhone.map((passenger, index) => {
            const contactDisplay = passenger.contact_name 
              ? `${passenger.contact_phone} - ${passenger.contact_name}`
              : passenger.contact_phone || '';
            const phones = extractAllPhoneNumbers(passenger.contact_phone || '');
            const hasMultiplePhones = phones.length > 1;
            
            return (
              <div 
                key={passenger.id}
                className={`p-3 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm truncate">{passenger.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate pl-8">{contactDisplay}</p>
                  </div>
                  {phones.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasMultiplePhones ? (
                        <>
                          <PhoneSelector 
                            phones={phones} 
                            onSelect={handleCall} 
                            type="call" 
                          />
                          <WhatsAppWithPhoneSelector 
                            phones={phones} 
                            userName={passenger.name} 
                          />
                        </>
                      ) : (
                        <>
                          <a
                            href={`tel:+34${phones[0].number}`}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95"
                            title="Deitu / Llamar"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:+34${phones[0].number}`;
                            }}
                          >
                            <Phone size={20} />
                          </a>
                          <WhatsAppMenu phone={phones[0].number} userName={passenger.name} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="schedule-table">
            <thead>
              <tr className="bg-header text-header-foreground">
                <th className="schedule-header w-16 text-center">
                  Zk. / Nº
                </th>
                <th className="schedule-header">
                  <div className="flex items-center gap-1.5">
                    <User size={14} />
                    Erabiltzailea / Usuario
                  </div>
                </th>
                <th className="schedule-header">
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} />
                    Kontaktua / Contacto
                  </div>
                </th>
                <th className="schedule-header w-32 text-center">
                  Ekintzak / Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {contactsWithPhone.map((passenger, index) => {
                const contactDisplay = passenger.contact_name 
                  ? `${passenger.contact_phone} - ${passenger.contact_name}`
                  : passenger.contact_phone || '';
                const phones = extractAllPhoneNumbers(passenger.contact_phone || '');
                const hasMultiplePhones = phones.length > 1;
                
                return (
                  <tr 
                    key={passenger.id}
                    className={`${index % 2 === 0 ? 'schedule-row-even' : 'schedule-row-odd'} hover:bg-muted/50 transition-colors`}
                  >
                    <td className="schedule-cell text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-sm">
                        {index + 1}
                      </span>
                    </td>
                    <td className="schedule-cell font-medium">{passenger.name}</td>
                    <td className="schedule-cell text-muted-foreground">{contactDisplay}</td>
                    <td className="schedule-cell">
                      <div className="flex items-center justify-center gap-2">
                        {phones.length > 0 && (
                          <>
                            {hasMultiplePhones ? (
                              <>
                                <PhoneSelector 
                                  phones={phones} 
                                  onSelect={handleCall} 
                                  type="call" 
                                />
                                <WhatsAppWithPhoneSelector 
                                  phones={phones} 
                                  userName={passenger.name} 
                                />
                              </>
                            ) : (
                              <>
                                <a
                                  href={`tel:+34${phones[0].number}`}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95"
                                  title="Deitu / Llamar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `tel:+34${phones[0].number}`;
                                  }}
                                >
                                  <Phone size={18} />
                                </a>
                                <WhatsAppMenu phone={phones[0].number} userName={passenger.name} />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
