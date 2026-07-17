import { useCountry } from "@/contexts/CountryContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FlaskConical, MapPin, Phone, ArrowLeft, Plus, Minus, Check, CalendarClock } from "lucide-react";

export default function LabDetail() {
  const { country } = useCountry();
  const currency = country?.currency_code || 'MZN';
  const { id } = useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string>("Todas");
  const [placing, setPlacing] = useState(false);

  // form
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [homeCollection, setHomeCollection] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: l }, { data: e }] = await Promise.all([
        supabase.from("clinics").select("*").eq("id", id).maybeSingle(),
        supabase.from("lab_exams").select("*").eq("lab_id", id).eq("is_active", true).order("category"),
      ]);
      setLab(l);
      setExams(e || []);
      setLoading(false);

      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: prof } = await (supabase.rpc as any)("get_profile_private", { _user_id: u.user.id }).maybeSingle();
        if (prof) {
          setPatientName(prof.full_name || "");
          setPhone(prof.phone || "");
        }
      }
    })();
  }, [id]);

  const categories = useMemo(() => ["Todas", ...Array.from(new Set(exams.map((e) => e.category)))], [exams]);
  const visible = useMemo(() => category === "Todas" ? exams : exams.filter((e) => e.category === category), [exams, category]);

  const total = useMemo(() =>
    exams.reduce((sum, e) => sum + (Number(e.price_mzn) * (cart[e.id] || 0)), 0),
    [cart, exams]
  );
  const itemsCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const inc = (eid: string) => setCart((c) => ({ ...c, [eid]: (c[eid] || 0) + 1 }));
  const dec = (eid: string) => setCart((c) => ({ ...c, [eid]: Math.max(0, (c[eid] || 0) - 1) }));

  const placeOrder = async () => {
    if (itemsCount === 0) return toast.error("Adiciona pelo menos um exame");
    if (!patientName.trim()) return toast.error("Nome do paciente é obrigatório");
    if (homeCollection && !address.trim()) return toast.error("Morada para recolha é obrigatória");

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return nav("/auth");

    setPlacing(true);
    const items = exams
      .filter((e) => (cart[e.id] || 0) > 0)
      .map((e) => ({ id: e.id, name: e.name, price: Number(e.price_mzn), qty: cart[e.id] }));

    const { data: order, error } = await supabase.from("lab_exam_orders").insert({
      user_id: u.user.id,
      lab_id: id,
      patient_name: patientName,
      patient_phone: phone,
      scheduled_at: scheduledAt || null,
      home_collection: homeCollection,
      collection_address: homeCollection ? address : null,
      collection_city: lab?.city,
      items,
      total_mzn: total,
      notes: notes || null,
      status: "pending",
    }).select().single();
    setPlacing(false);

    if (error) return toast.error(error.message);
    toast.success("Pedido criado! O laboratório vai confirmar em breve.");
    nav(`/health/exams/my`);
  };

  if (loading) return <div className="p-4 space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (!lab) return <div className="p-4">Laboratório não encontrado.</div>;

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in pb-32">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="w-fit -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="bento-card p-4 flex items-start gap-3">
        {lab.logo_url ? (
          <img src={lab.logo_url} alt={lab.name} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black">{lab.name}</h1>
          <p className="text-xs text-muted-foreground line-clamp-2">{lab.description}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lab.city} · {lab.address}</span>
            {lab.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lab.phone}</span>}
          </div>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Este laboratório ainda não tem exames publicados.</p>
          <p className="text-xs mt-1">Contacta directamente: {lab.phone || "—"}</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {visible.map((e) => (
              <div key={e.id} className="bento-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{e.name}</h3>
                    <Badge variant="outline" className="text-[9px]">{e.category}</Badge>
                  </div>
                  {e.prep_instructions && <p className="text-[11px] text-muted-foreground mt-0.5">Preparação: {e.prep_instructions}</p>}
                  <p className="text-sm font-bold text-primary mt-1">{Number(e.price_mzn).toLocaleString()} {currency}</p>
                </div>
                {(cart[e.id] || 0) === 0 ? (
                  <Button size="sm" onClick={() => inc(e.id)}><Plus className="h-4 w-4" /></Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => dec(e.id)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-bold w-5 text-center">{cart[e.id]}</span>
                    <Button size="icon" className="h-8 w-8" onClick={() => inc(e.id)}><Plus className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {itemsCount > 0 && (
            <div className="bento-card p-4 space-y-3">
              <h3 className="font-bold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Detalhes do pedido</h3>
              <div className="grid gap-2">
                <div>
                  <Label>Nome do paciente</Label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                </div>
                <div>
                  <Label>Telefone de contacto</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258..." />
                </div>
                <div>
                  <Label>Data/hora preferida</Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                  <Label htmlFor="home">Recolha ao domicílio</Label>
                  <Switch id="home" checked={homeCollection} onCheckedChange={setHomeCollection} />
                </div>
                {homeCollection && (
                  <div>
                    <Label>Morada de recolha</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" />
                  </div>
                )}
                <div>
                  <Label>Notas (opcional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {itemsCount > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bento-card p-3 flex items-center gap-3 shadow-strong border border-primary/40 z-50">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{itemsCount} exame{itemsCount > 1 ? "s" : ""}</p>
            <p className="font-bold text-primary">{total.toLocaleString()} {currency}</p>
          </div>
          <Button onClick={placeOrder} disabled={placing}>
            <Check className="h-4 w-4 mr-1" /> {placing ? "A criar..." : "Confirmar pedido"}
          </Button>
        </div>
      )}
    </div>
  );
}