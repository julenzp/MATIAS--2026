import { useState, useMemo } from "react";
import { MessageCircle, Send, X, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

type Contact = {
  id: string;
  name: string;
  phone: string;
};

interface WhatsAppBulkSenderProps {
  contacts: Contact[];
  routeCode: string;
}

type TemplateType = "delay10" | "delay20" | "custom";

const generateMessage = (template: TemplateType, name: string, customText: string): string => {
  switch (template) {
    case "delay10":
      return `Buenos días, ${name}. Le informamos de que llevamos un retraso de 10 minutos. Disculpe las molestias. Gracias.`;
    case "delay20":
      return `Buenos días, ${name}. Le informamos de que llevamos un retraso de 20 minutos. Disculpe las molestias. Gracias.`;
    case "custom":
      return customText ? `${customText} ${name}.` : "";
  }
};

export const WhatsAppBulkSender = ({ contacts, routeCode }: WhatsAppBulkSenderProps) => {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<TemplateType>("delay10");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(contacts.map(c => c.id)));
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedIds(new Set(contacts.map(c => c.id)));
      setTemplate("delay10");
      setCustomMessage("");
      setSending(false);
      setSentCount(0);
    }
  };

  const allSelected = selectedIds.size === contacts.length;
  const selectedCount = selectedIds.size;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const previewMessage = useMemo(() => {
    const exampleName = contacts[0]?.name || "Usuario";
    return generateMessage(template, exampleName, customMessage);
  }, [template, customMessage, contacts]);

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setSentCount(0);

    const selected = contacts.filter(c => selectedIds.has(c.id));

    for (let i = 0; i < selected.length; i++) {
      const contact = selected[i];
      const msg = generateMessage(template, contact.name, customMessage);
      const encoded = encodeURIComponent(msg);
      const url = `https://wa.me/34${contact.phone}?text=${encoded}`;

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSentCount(i + 1);

      if (i < selected.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Auto-crear incidencia para que la empresa lo vea
    try {
      let incidentMsg = "";
      if (template === "delay10") {
        incidentMsg = `📨 Envío masivo WhatsApp: Retraso 10 min (${selected.length} contactos)`;
      } else if (template === "delay20") {
        incidentMsg = `📨 Envío masivo WhatsApp: Retraso 20 min (${selected.length} contactos)`;
      } else {
        const preview = customMessage.length > 80 ? customMessage.slice(0, 80) + "…" : customMessage;
        incidentMsg = `📨 Envío masivo WhatsApp: "${preview}" (${selected.length} contactos)`;
      }

      await supabase.from("route_incidents").insert({
        route: routeCode,
        message: incidentMsg,
        incident_date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("[WhatsAppBulk] Error creating incident:", err);
    }

    setSending(false);
  };

  const isValid = template !== "custom" || customMessage.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            <MessageCircle size={18} />
            📨 Envío Masivo WhatsApp
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="text-green-600" size={22} />
              Envío Masivo WhatsApp
            </DialogTitle>
          </DialogHeader>

          {sending ? (
            <div className="py-8 text-center space-y-4">
              <div className="text-4xl animate-pulse">📲</div>
              <p className="text-lg font-medium">Abriendo WhatsApp...</p>
              <p className="text-muted-foreground">
                {sentCount} de {selectedCount} enviados
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(sentCount / selectedCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Confirma cada mensaje en la ventana de WhatsApp
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 1. Templates */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  1. Elige plantilla de mensaje
                </h4>
                <RadioGroup value={template} onValueChange={(v) => setTemplate(v as TemplateType)}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${template === "delay10" ? "border-green-400 bg-green-50 dark:bg-green-900/20" : "border-border"}`}>
                    <RadioGroupItem value="delay10" id="delay10" />
                    <Label htmlFor="delay10" className="cursor-pointer flex-1">
                      ⏱️ Retraso 10 minutos
                    </Label>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${template === "delay20" ? "border-green-400 bg-green-50 dark:bg-green-900/20" : "border-border"}`}>
                    <RadioGroupItem value="delay20" id="delay20" />
                    <Label htmlFor="delay20" className="cursor-pointer flex-1">
                      ⏰ Retraso 20 minutos
                    </Label>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${template === "custom" ? "border-green-400 bg-green-50 dark:bg-green-900/20" : "border-border"}`}>
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer flex-1">
                      ✏️ Mensaje personalizado
                    </Label>
                  </div>
                </RadioGroup>

                {template === "custom" && (
                  <Textarea
                    placeholder="Escribe tu mensaje aquí... El nombre del usuario se añade al final."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                )}
              </div>

              {/* 2. Preview */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  2. Vista previa
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm leading-relaxed">
                    {previewMessage || <span className="text-muted-foreground italic">Escribe un mensaje para ver la vista previa...</span>}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  💡 El nombre cambia para cada contacto automáticamente
                </p>
              </div>

              {/* 3. Contact selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    3. Seleccionar contactos
                  </h4>
                  <span className="text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                    {selectedCount} de {contacts.length} seleccionados
                  </span>
                </div>

                <div
                  className="flex items-center gap-3 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/50"
                  onClick={toggleAll}
                >
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  <span className="font-medium text-sm">Seleccionar todos</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                  {contacts.map((contact) => {
                    const selected = selectedIds.has(contact.id);
                    return (
                      <div
                        key={contact.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selected
                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleOne(contact.id)}
                      >
                        <Checkbox checked={selected} onCheckedChange={() => toggleOne(contact.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        </div>
                        <MessageCircle size={14} className="text-green-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Send button */}
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                disabled={selectedCount === 0 || !isValid}
                onClick={() => setShowConfirm(true)}
              >
                <Send size={18} />
                📲 Enviar WhatsApp ({selectedCount})
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar envío masivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se abrirá WhatsApp para <strong>{selectedCount}</strong> contacto{selectedCount !== 1 ? "s" : ""}. 
              Deberás confirmar cada mensaje manualmente en WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSend}
            >
              Confirmar envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
