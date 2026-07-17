import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

/**
 * WaitlistDialog — Recomendação 1.2 / 4.1 do relatório estratégico:
 * "Sem médicos disponíveis nesta especialidade" pode ser desmotivador.
 * Oferecemos alternativa concreta: avisar quando houver prestador disponível.
 */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind?: "doctor" | "pharmacy" | "clinic";
  specialtyId?: string;
  specialtyName?: string;
  onSuccess?: () => void;
}

export default function WaitlistDialog({
  open, onOpenChange, kind = "doctor", specialtyId, specialtyName, onSuccess,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { city } = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [neighborhood, setNeighborhood] = useState("");
  const [notes, setNotes] = useState("");
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string>(specialtyId ?? "");

  useEffect(() => {
    if (!open || kind !== "doctor") return;
    supabase.from("medical_specialties").select("id, name").order("name")
      .then(({ data }) => setSpecialties(data ?? []));
  }, [open, kind]);

  useEffect(() => {
    if (specialtyId) setSelectedSpec(specialtyId);
  }, [specialtyId]);

  const kindLabel = kind === "pharmacy" ? "farmácia" : kind === "clinic" ? "clínica" : "médico";

  const submit = async () => {
    if (!user) { onOpenChange(false); navigate("/auth"); return; }
    if (!city) return toast.error("Cidade é necessária");
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("provider_waitlist").insert({
        user_id: user.id,
        requested_kind: kind,
        specialty_id: kind === "doctor" && selectedSpec ? selectedSpec : null,
        city,
        neighborhood: neighborhood.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      setDone(true);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a registar");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDone(false);
    setNotes("");
    setNeighborhood("");
    setSelectedSpec(specialtyId ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Lista de espera
          </DialogTitle>
          <DialogDescription>
            Avisamos-te assim que houver {kindLabel} disponível{specialtyName ? ` de ${specialtyName}` : ""} na tua zona.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-2" />
            <p className="font-bold">Estás na lista!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Receberás uma notificação assim que houver {kindLabel} disponível em <strong>{city}</strong>.
            </p>
            <Button className="mt-4 w-full" onClick={() => { onOpenChange(false); reset(); }}>
              Concluído
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              Cidade: <strong>{city || "—"}</strong>
            </div>

            {kind === "doctor" && (
              <div>
                <Label>Especialidade (opcional)</Label>
                <Select value={selectedSpec} onValueChange={setSelectedSpec}>
                  <SelectTrigger><SelectValue placeholder="Qualquer especialidade" /></SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Bairro (opcional)</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Ex: Polana, Matola" />
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Horário preferido, idioma, etc."
              />
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A registar...</>
                : <><Bell className="h-4 w-4 mr-1" /> Quero ser avisado</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}