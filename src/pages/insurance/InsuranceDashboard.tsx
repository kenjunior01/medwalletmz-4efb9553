import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield, Plus, Trash2, Megaphone, Users, FileText, DollarSign,
  Percent, RefreshCw, Pencil,
} from "@/components/icons/lucide-compat";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AnyRec = Record<string, any>;

const emptyPlan = {
  name: "",
  description: "",
  monthly_price_mzn: 0,
  coverage_percent: 50,
  max_coverage_mzn: 0,
  benefits_text: "",
};

export default function InsuranceDashboard() {
  const { user } = useAuth();
  const { t, country } = useCountry();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const locale = country?.default_locale || 'pt-MZ';
  const currency = country?.currency_symbol || country?.currency_code || 'MZN';
  const tc = (k: string, p?: Record<string, string>) => t(`panels.insurance.${k}`, p);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRec | null>(null);
  const [plan, setPlan] = useState<AnyRec>({ ...emptyPlan });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const companyQ = useQuery({
    queryKey: ["my-insurance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_companies")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as AnyRec) || null;
    },
    enabled: !!user,
  });

  const company = companyQ.data;
  const companyId = company?.id as string | undefined;

  const plansQ = useQuery({
    queryKey: ["my-insurance-plans", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_plans")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data as AnyRec[]) || [];
    },
    enabled: !!companyId,
  });

  const plans = useMemo(() => plansQ.data || [], [plansQ.data]);
  const planIds = useMemo(() => plans.map((p) => p.id), [plans]);

  // Membros reais: user_insurance ligado aos planos da seguradora
  const membersQ = useQuery({
    queryKey: ["insurance-members", companyId, planIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_insurance")
        .select("*")
        .in("plan_id", planIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data as AnyRec[]) || [];
      const userIds = [...new Set(list.map((m) => m.user_id))].slice(0, 50);
      let names: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        names = Object.fromEntries((profs || []).map((p: AnyRec) => [p.user_id, p.full_name]));
      }
      return list.map((m) => ({ ...m, name: names[m.user_id] || "" }));
    },
    enabled: !!companyId && plansQ.isSuccess && planIds.length > 0,
  });

  const members = membersQ.data || [];
  const activeMembers = members.filter((m) => m.status === "active");
  const mrr = plans.reduce((sum, p) => {
    const count = activeMembers.filter((m) => m.plan_id === p.id).length;
    return sum + count * Number(p.monthly_price_mzn || 0);
  }, 0);
  const avgCoverage = plans.length
    ? Math.round(plans.reduce((s, p) => s + Number(p.coverage_percent || 0), 0) / plans.length)
    : 0;

  const openCreate = () => { setEditing(null); setPlan({ ...emptyPlan }); setOpen(true); };
  const openEdit = (p: AnyRec) => {
    setEditing(p);
    setPlan({
      name: p.name || "",
      description: p.description || "",
      monthly_price_mzn: Number(p.monthly_price_mzn) || 0,
      coverage_percent: Number(p.coverage_percent) || 0,
      max_coverage_mzn: Number(p.max_coverage_mzn) || 0,
      benefits_text: (p.features || []).join("\n"),
    });
    setOpen(true);
  };

  const submitPlan = async () => {
    if (!company || !plan.name.trim()) return;
    setSaving(true);
    const benefits = plan.benefits_text.split("\n").map((b: string) => b.trim()).filter(Boolean);
    const payload = {
      name: plan.name,
      description: plan.description,
      monthly_price_mzn: plan.monthly_price_mzn,
      coverage_percent: plan.coverage_percent,
      max_coverage_mzn: plan.max_coverage_mzn,
      features: benefits as any,
    };
    const { error } = editing
      ? await supabase.from("insurance_plans").update(payload).eq("id", editing.id)
      : await supabase.from("insurance_plans").insert({ ...payload, company_id: company.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? tc("plan_updated") : tc("plan_created"));
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["my-insurance-plans"] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("insurance_plans").delete().eq("id", id);
    setDeletingId(null);
    if (error) return toast.error(error.message);
    toast.success(tc("deleted"));
    qc.invalidateQueries({ queryKey: ["my-insurance-plans"] });
  };

  if (companyQ.isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (companyQ.error) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-3">{t('panels.common.error_load')}</p>
        <Button onClick={() => companyQ.refetch()}>{t('panels.common.retry')}</Button>
      </div>
    );
  }

  if (!company) return (
    <div className="p-8 text-center">
      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
      <p className="mb-4">{tc("no_profile")}</p>
      <Button onClick={() => navigate("/insurance/register")}>{tc("create_profile")}</Button>
    </div>
  );

  const kpis = [
    { icon: Users, v: String(activeMembers.length), l: tc("kpi_members"), c: "text-primary" },
    { icon: FileText, v: String(plans.length), l: tc("kpi_plans"), c: "text-secondary" },
    { icon: DollarSign, v: `${mrr.toLocaleString(locale)} ${currency}`, l: tc("kpi_mrr"), c: "text-gold" },
    { icon: Percent, v: `${avgCoverage}%`, l: tc("kpi_coverage"), c: "text-pharmacy" },
  ];

  return (
    <div className="p-4 flex flex-col gap-5 max-w-4xl mx-auto pb-24 animate-fade-in">
      {/* Cabeçalho da seguradora */}
      <div className="bento-card p-5 flex items-center gap-4">
        <Shield className="h-11 w-11 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black truncate">{company.name}</h1>
          <p className="text-xs text-muted-foreground">
            {company.city} · {company.is_verified ? tc("verified_public") : tc("awaiting_admin")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/ads/new")}>
          <Megaphone className="h-4 w-4 mr-1" /> {tc("ad_cta")}
        </Button>
      </div>

      {!company.is_verified && (
        <div className="bento-card p-4 border-l-4 border-l-yellow-500 bg-yellow-500/5">
          <p className="text-sm font-semibold">{tc("review_title")}</p>
          <p className="text-xs text-muted-foreground">{tc("review_desc")}</p>
        </div>
      )}

      {/* KPIs reais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.l} className="p-3">
            <k.icon className={`h-4 w-4 mb-1.5 ${k.c}`} aria-hidden="true" />
            <p className="text-xl font-black tabular-nums leading-none">{k.v}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{k.l}</p>
          </Card>
        ))}
      </div>

      {/* Planos */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">{tc("plans_title")} ({plans.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />{tc("new_plan")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? tc("edit") : tc("new_plan")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>{tc("plan_name")}</Label><Input value={plan.name} onChange={e => setPlan({ ...plan, name: e.target.value })} /></div>
              <div><Label>{tc("plan_desc")}</Label><Textarea value={plan.description} onChange={e => setPlan({ ...plan, description: e.target.value })} /></div>
              <div>
                <Label>{tc("plan_benefits")}</Label>
                <Textarea
                  placeholder={"Consultas grátis\n50% desconto em exames\n..."}
                  value={plan.benefits_text}
                  onChange={e => setPlan({ ...plan, benefits_text: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{tc("plan_price")}</Label><Input type="number" value={plan.monthly_price_mzn} onChange={e => setPlan({ ...plan, monthly_price_mzn: +e.target.value })} /></div>
                <div><Label>{tc("plan_coverage")}</Label><Input type="number" max={100} value={plan.coverage_percent} onChange={e => setPlan({ ...plan, coverage_percent: +e.target.value })} /></div>
                <div className="col-span-2"><Label>{tc("plan_max")}</Label><Input type="number" value={plan.max_coverage_mzn} onChange={e => setPlan({ ...plan, max_coverage_mzn: +e.target.value })} /></div>
              </div>
              <Button onClick={submitPlan} className="w-full" disabled={saving || !plan.name.trim()}>
                {editing ? tc("save_edit") : tc("create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plansQ.isSuccess && plans.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">{tc("no_plans")}</Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="bento-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label={tc("edit")}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeletingId(p.id)} aria-label={tc("deleted")}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="text-2xl font-black text-primary mt-2 tabular-nums">
              {Number(p.monthly_price_mzn).toLocaleString(locale)}
              <span className="text-xs text-muted-foreground"> {tc("per_month")}</span>
            </p>
            <p className="text-xs mt-1">{tc("coverage_line")} {p.coverage_percent}%</p>
          </div>
        ))}
      </div>

      {/* Membros recentes */}
      {plans.length > 0 && (
        <section aria-labelledby="members-h">
          <h2 id="members-h" className="font-bold text-base mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> {tc("members_title")}
          </h2>
          {membersQ.isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : members.length === 0 ? (
            <Card className="p-5 text-center text-sm text-muted-foreground">{tc("no_members")}</Card>
          ) : (
            <div className="space-y-2">
              {members.slice(0, 10).map((m) => {
                const planName = plans.find((p) => p.id === m.plan_id)?.name || "—";
                return (
                  <Card key={m.id} className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.name || m.member_number || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {planName} · {tc("member_since")} {new Date(m.created_at).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge variant={m.status === "active" ? "default" : "outline"} className="text-[10px]">
                      {m.status === "active" ? t("panels.common.verified") : m.status}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Confirmação de eliminação */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc("delete_confirm")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("panels.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && del(deletingId)}>
              {t("panels.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
