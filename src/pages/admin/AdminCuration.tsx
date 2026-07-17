import { useMemo, useState } from 'react';
import { uploadImageToStorage } from '@/lib/imageUpload';
import { SafeImage } from '@/components/ui/safe-image';
import { getSafeImageUrl, normalizeImageUrl } from '@/lib/healthRoutes';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  ExternalLink,
  FlaskConical,
  History,
  Hospital,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Locate,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  User as UserIcon,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LogoUpload } from '@/components/upload/LogoUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type EntityType = 'pharmacy' | 'clinic' | 'hospital' | 'doctor' | 'lab' | 'laboratory' | 'veterinary' | 'other';
type TypeFilter = 'all' | 'pharmacy' | 'clinic' | 'hospital' | 'lab' | 'veterinary';

type Proposal = {
  id: string;
  source: 'google_places' | 'user_submit' | 'legacy';
  entity_type: EntityType;
  name: string;
  address: string | null;
  city: string;
  neighborhood: string | null;
  reference_point: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'duplicate' | 'merged';
  reward_amount: number | null;
  reward_currency: string | null;
  reward_joy_coins: number | null;
  reward_paid: boolean | null;
  review_notes: string | null;
  created_at: string;
  updated_at?: string | null;
  raw_payload: any;
  search_meta: any;
  proposed_by: string | null;
  source_table?: 'stores' | 'clinics' | null;
};

type AuditLog = {
  id: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
  changed_by: string | null;
};

const PAGE_SIZE = 25;
const MZ_BOUNDS = { minLat: -27.5, maxLat: -10.0, minLng: 30.0, maxLng: 41.5 };

const entityIcon: Record<string, any> = {
  pharmacy: Store,
  clinic: Building2,
  hospital: Hospital,
  doctor: UserIcon,
  lab: FlaskConical,
  other: MapPin,
};

const entityLabel: Record<string, string> = {
  pharmacy: 'Farmácia',
  clinic: 'Clínica',
  hospital: 'Hospital',
  doctor: 'Médico',
  lab: 'Laboratório',
  other: 'Outro',
};

export default function AdminCuration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, loading } = useAuth();
  const { country } = useCountry();
  const isAdmin = hasRole('admin');
  const isManager = hasRole('country_manager');
  const [tab, setTab] = useState<'pending' | 'in_review' | 'approved' | 'rejected' | 'all'>('pending');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'google_places' | 'user_submit' | 'legacy'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [reviewing, setReviewing] = useState<Proposal | null>(null);
  const [draft, setDraft] = useState<Partial<Proposal>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const citiesQuery = useQuery<string[]>({
    queryKey: ['curation-cities', country?.id],
    enabled: !loading && (isAdmin || isManager),
    queryFn: async () => {
      let q = (supabase as any)
        .from('place_proposals')
        .select('city')
        .order('city', { ascending: true });

      if (country?.id) q = q.eq('country_id', country.id);

      const { data, error } = await q;
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r: any) => r.city).filter(Boolean)));
    },
    staleTime: 60_000,
  });

  const statsQuery = useQuery<Record<string, number>>({
    queryKey: ['curation-stats', country?.id],
    enabled: !loading && (isAdmin || isManager),
    queryFn: async () => {
      let q = (supabase as any).from('place_proposals').select('status');
      if (country?.id) q = q.eq('country_id', country.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).reduce((acc: Record<string, number>, r: any) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
    },
    staleTime: 30_000,
  });

  const proposalsQuery = useQuery<Proposal[]>({
    queryKey: ['curation-proposals', country?.id, tab, sourceFilter, cityFilter, typeFilter, search.trim(), page],
    enabled: !loading && (isAdmin || isManager),
    queryFn: async () => {
      let q = (supabase as any)
        .from('place_proposals')
        .select('id, source, entity_type, name, address, city, neighborhood, reference_point, phone, website, description, image_url, latitude, longitude, status, reward_amount, reward_currency, reward_joy_coins, reward_paid, review_notes, created_at, updated_at, raw_payload, search_meta, proposed_by, country_id')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (country?.id) q = q.eq('country_id', country.id);
      if (tab !== 'all') q = q.eq('status', tab);
      if (sourceFilter !== 'all') q = q.eq('source', sourceFilter);
      if (cityFilter !== 'all') q = q.eq('city', cityFilter);
      if (typeFilter === 'pharmacy' || typeFilter === 'hospital' || typeFilter === 'veterinary') {
        q = q.eq('entity_type', typeFilter);
      }
      if (typeFilter === 'lab') q = q.in('entity_type', ['lab', 'laboratory']);
      if (typeFilter === 'clinic') q = q.eq('entity_type', 'clinic');
      if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as Proposal[];

      let sq = (supabase as any)
        .from('stores')
        .select('id, name, address, city, phone, website, description, image_url, latitude, longitude, type, created_at')
        .order('created_at', { ascending: false });

      if (country?.id) sq = sq.eq('country_id', country.id);
      const { data: storesData } = await sq;

      let cq = (supabase as any)
        .from('clinics')
        .select('id, name, address, city, phone, website, description, logo_url, latitude, longitude, created_at')
        .order('created_at', { ascending: false });

      if (country?.id) cq = cq.eq('country_id', country.id);
      const { data: clinicsData } = await cq;

      const legacyRows: Proposal[] = [
        ...(storesData ?? []).map((row: any) => ({
          id: row.id,
          source: 'legacy' as const,
          source_table: 'stores' as const,
          entity_type: row.type === 'pharmacy' ? 'pharmacy' : 'other',
          name: row.name,
          address: row.address ?? null,
          city: row.city,
          neighborhood: null,
          reference_point: null,
          phone: row.phone ?? null,
          website: row.website ?? null,
          description: row.description ?? null,
          image_url: normalizeImageUrl(row.image_url),
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          status: 'approved' as const,
          reward_amount: null,
          reward_currency: null,
          reward_joy_coins: null,
          reward_paid: null,
          review_notes: null,
          created_at: row.created_at ?? new Date().toISOString(),
          updated_at: null,
          raw_payload: { table: 'stores' },
          search_meta: { table: 'stores' },
          proposed_by: null,
        })),
        ...(clinicsData ?? []).map((row: any) => ({
          id: row.id,
          source: 'legacy' as const,
          source_table: 'clinics' as const,
          entity_type: /hospital/i.test(row.description ?? '') ? 'hospital' : 'clinic',
          name: row.name,
          address: row.address ?? null,
          city: row.city,
          neighborhood: null,
          reference_point: null,
          phone: row.phone ?? null,
          website: row.website ?? null,
          description: row.description ?? null,
          image_url: normalizeImageUrl(row.logo_url),
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          status: 'approved' as const,
          reward_amount: null,
          reward_currency: null,
          reward_joy_coins: null,
          reward_paid: null,
          review_notes: null,
          created_at: row.created_at ?? new Date().toISOString(),
          updated_at: null,
          raw_payload: { table: 'clinics' },
          search_meta: { table: 'clinics' },
          proposed_by: null,
        })),
      ];

      const merged = [...rows, ...legacyRows];
      const filtered = merged.filter((item) => {
        if (tab !== 'all' && item.status !== tab) return false;
        if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
        if (cityFilter !== 'all' && item.city !== cityFilter) return false;
        if (typeFilter === 'pharmacy' || typeFilter === 'hospital' || typeFilter === 'veterinary') return item.entity_type === typeFilter;
        if (typeFilter === 'lab') return item.entity_type === 'lab' || item.entity_type === 'laboratory';
        if (typeFilter === 'clinic') return item.entity_type === 'clinic';
        return true;
      });

      if (search.trim()) {
        return filtered.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
      }

      if (typeFilter === 'lab') return filtered.filter(isLaboratoryProposal);
      if (typeFilter === 'clinic') return filtered.filter((p) => !isLaboratoryProposal(p));
      return filtered;
    },
    staleTime: 10_000,
  });

  const auditQuery = useQuery<AuditLog[]>({
    queryKey: ['curation-audit', reviewing?.id],
    enabled: !!reviewing?.id && !loading && (isAdmin || isManager),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('place_proposal_audit_logs')
        .select('id, action, changes, created_at, changed_by')
        .eq('proposal_id', reviewing!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const proposals = proposalsQuery.data ?? [];
  const selectedProposals = useMemo(
    () => proposals.filter((p) => selected.has(p.id)),
    [proposals, selected],
  );

  const resetPage = () => {
    setPage(0);
    setSelected(new Set());
  };

  const openReview = (proposal: Proposal) => {
    setReviewing(proposal);
    setDraft({ ...proposal });
  };

  const saveDraft = async () => {
    if (!reviewing) return false;
    const cleaned = cleanDraft(draft);
    const validation = validateProposal({ ...reviewing, ...cleaned });
    if (validation.blockers.length) {
      toast.error(validation.blockers[0]);
      return false;
    }
    if (reviewing.source_table === 'stores') {
      const { error } = await (supabase as any)
        .from('stores')
        .update({
          name: cleaned.name,
          address: cleaned.address,
          city: cleaned.city,
          phone: cleaned.phone,
          website: cleaned.website,
          description: cleaned.description,
          image_url: cleaned.image_url,
          latitude: cleaned.latitude,
          longitude: cleaned.longitude,
        })
        .eq('id', reviewing.id);
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else if (reviewing.source_table === 'clinics') {
      const { error } = await (supabase as any)
        .from('clinics')
        .update({
          name: cleaned.name,
          address: cleaned.address,
          city: cleaned.city,
          phone: cleaned.phone,
          website: cleaned.website,
          description: cleaned.description,
          logo_url: cleaned.image_url,
          latitude: cleaned.latitude,
          longitude: cleaned.longitude,
        })
        .eq('id', reviewing.id);
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else {
      const { error } = await (supabase as any)
        .from('place_proposals')
        .update(cleaned)
        .eq('id', reviewing.id);
      if (error) {
        toast.error(error.message);
        return false;
      }
    }
    toast.success('Alterações guardadas');
    await queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
    await queryClient.invalidateQueries({ queryKey: ['curation-audit', reviewing.id] });
    setReviewing((prev) => prev ? { ...prev, ...cleaned } as Proposal : prev);
    return true;
  };

  const approve = useMutation({
    mutationFn: async (proposal: Proposal) => {
      const validation = validateProposal(proposal);
      if (validation.blockers.length) throw new Error(validation.blockers[0]);
      if (proposal.source_table === 'stores' || proposal.source_table === 'clinics') {
        return { publish_target: proposal.source_table === 'stores' ? 'stores' : 'clinics' };
      }
      const { data, error } = await (supabase as any).rpc('approve_proposal', { p_id: proposal.id, p_notes: proposal.review_notes ?? null });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const rewarded = data?.reward_paid ? ' · recompensa paga' : '';
      toast.success(`Publicado em ${data?.publish_target ?? 'base'}${rewarded}`);
      setReviewing(null);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao aprovar'),
  });

  const reject = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string | null }) => {
      const { data, error } = await (supabase as any).rpc('reject_proposal', { p_id: id, p_notes: notes || 'Rejeitado pelo admin' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Proposta rejeitada');
      setReviewing(null);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao rejeitar'),
  });

  const bulkApprove = useMutation({
    mutationFn: async (items: Proposal[]) => {
      let ok = 0;
      let fail = 0;
      const errors: string[] = [];
      for (const p of items) {
        const validation = validateProposal(p);
        if (validation.blockers.length) {
          fail++;
          errors.push(`${p.name}: ${validation.blockers[0]}`);
          continue;
        }
        const { error } = await (supabase as any).rpc('approve_proposal', { p_id: p.id, p_notes: p.review_notes ?? null });
        if (error) {
          fail++;
          errors.push(`${p.name}: ${error.message}`);
        } else {
          ok++;
        }
      }
      return { ok, fail, errors };
    },
    onSuccess: ({ ok, fail, errors }) => {
      toast.success(`${ok} aprovadas · ${fail} falharam`);
      if (errors[0]) toast.warning(errors[0]);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro na aprovação em massa'),
  });

  const bulkReject = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await (supabase as any).rpc('reject_proposals_bulk', {
        _ids: ids,
        _notes: 'Rejeitado em massa pelo admin',
      });
      if (error) throw error;
      return { ok: data?.ok ?? 0, fail: data?.fail ?? 0 };
    },
    onSuccess: ({ ok, fail }) => {
      toast.success(`${ok} rejeitadas · ${fail} falharam`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro na rejeição em massa'),
  });

  const filteredLabel = [
    cityFilter !== 'all' ? cityFilter : 'todas cidades',
    typeFilter !== 'all' ? entityLabel[typeFilter] : 'todos tipos',
  ].join(' · ');

  if (loading) return <CurationSkeleton />;

  if (!isAdmin && !isManager) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Acesso restrito.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/bootstrap')}>
          Bootstrap admin
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Curadoria de Locais
          </h1>
          <p className="text-muted-foreground text-sm">
            Revê, valida coordenadas e publica farmácias, clínicas, hospitais e laboratórios em {country?.name}.
          </p>
        </div>
        <Link to={isManager ? "/manager" : "/admin/import"} className="text-xs text-primary underline">
          ← Voltar ao Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { key: 'pending', label: 'Pendentes', tone: 'bg-warning/15 text-warning' },
          { key: 'in_review', label: 'Em revisão', tone: 'bg-secondary/15 text-secondary' },
          { key: 'approved', label: 'Aprovadas', tone: 'bg-primary/15 text-primary' },
          { key: 'rejected', label: 'Rejeitadas', tone: 'bg-destructive/15 text-destructive' },
          { key: 'duplicate', label: 'Duplicadas', tone: 'bg-muted text-muted-foreground' },
        ].map((s) => (
          <Card key={s.key} className={cn('p-3 text-center border-0', s.tone)}>
            <p className="text-2xl font-black">{statsQuery.data?.[s.key] ?? 0}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3 space-y-3">
        <Tabs value={tab} onValueChange={(v: any) => { setTab(v); resetPage(); }}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="in_review">Em revisão</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            <TabsTrigger value="all">Tudo</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Cidade</Label>
            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); resetPage(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {(citiesQuery.data ?? []).map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
            <Select value={typeFilter} onValueChange={(v: TypeFilter) => { setTypeFilter(v); resetPage(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="pharmacy">Farmácias</SelectItem>
                <SelectItem value="clinic">Clínicas</SelectItem>
                <SelectItem value="hospital">Hospitais</SelectItem>
                <SelectItem value="lab">Laboratórios</SelectItem>
                <SelectItem value="veterinary">Veterinárias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Origem</Label>
            <Select value={sourceFilter} onValueChange={(v: any) => { setSourceFilter(v); resetPage(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="google_places">Google Places</SelectItem>
                <SelectItem value="user_submit">Utilizadores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Pesquisa</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Nome do local" />
            </div>
          </div>
        </div>
      </Card>

      {selected.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-primary" />
            <strong>{selected.size}</strong> selecionada(s) · {filteredLabel}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={bulkApprove.isPending || bulkReject.isPending} onClick={() => bulkApprove.mutate(selectedProposals)}>
              {bulkApprove.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Aprovar em massa
            </Button>
            <Button size="sm" variant="destructive" disabled={bulkApprove.isPending || bulkReject.isPending} onClick={() => bulkReject.mutate(Array.from(selected))}>
              {bulkReject.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              Rejeitar em massa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
          </div>
        </Card>
      )}

      {proposals.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            id="select-all"
            checked={proposals.every((p) => selected.has(p.id))}
            onCheckedChange={(checked) => {
              const next = new Set(selected);
              proposals.forEach((p) => checked ? next.add(p.id) : next.delete(p.id));
              setSelected(next);
            }}
          />
          <label htmlFor="select-all" className="cursor-pointer">Selecionar todos nesta página filtrada</label>
        </div>
      )}

      {proposalsQuery.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : proposals.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-sm">Nada por aqui nesta categoria. ✅</Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => <ProposalCard
            key={p.id}
            proposal={p}
            selected={selected.has(p.id)}
            busy={approve.isPending || reject.isPending}
            onSelect={(checked) => {
              const next = new Set(selected);
              checked ? next.add(p.id) : next.delete(p.id);
              setSelected(next);
            }}
            onReview={() => openReview(p)}
            onApprove={() => approve.mutate(p)}
            onReject={() => reject.mutate({ id: p.id })}
          />)}

          <div className="flex items-center justify-between pt-3">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {page + 1} · {proposals.length} de {PAGE_SIZE} visíveis</span>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={proposals.length < PAGE_SIZE}>
              Próxima <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Revisão da entidade
                </DialogTitle>
                <DialogDescription>
                  Valida os dados, coordenadas e imagem antes de publicar.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Nome"><Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                    <Field label="Cidade"><Input value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
                    <Field label="Morada"><Input value={draft.address ?? ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
                    <Field label="Telefone"><Input value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
                    <Field label="Latitude"><Input inputMode="decimal" value={draft.latitude ?? ''} onChange={(e) => setDraft({ ...draft, latitude: e.target.value as any })} /></Field>
                    <Field label="Longitude"><Input inputMode="decimal" value={draft.longitude ?? ''} onChange={(e) => setDraft({ ...draft, longitude: e.target.value as any })} /></Field>
                  </div>
                  <div className="flex justify-end">
                    <GeocodeButton draft={draft} onResolved={(lat, lng, formatted) => setDraft({ ...draft, latitude: lat as any, longitude: lng as any, address: draft.address || formatted || null })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <LogoUpload
                        label="Logotipo / Imagem"
                        description="Carregue uma imagem para garantir que seja visível para todos os utilizadores"
                        value={draft.image_url}
                        onUploaded={(url) => setDraft({ ...draft, image_url: url })}
                        bucket="licenses"
                        folder="place-images"
                      />
                    </div>
                    <Field label="Website"><Input value={draft.website ?? ''} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></Field>
                  </div>
                  <Field label="Notas / descrição"><Textarea rows={3} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
                  <Field label="Notas de revisão"><Textarea rows={2} value={draft.review_notes ?? ''} onChange={(e) => setDraft({ ...draft, review_notes: e.target.value })} placeholder="Opcional: motivo, correção feita, fonte confirmada..." /></Field>

                  <ValidationPanel proposal={{ ...reviewing, ...cleanDraft(draft) } as Proposal} />

                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Histórico de alterações</p>
                    </div>
                    {auditQuery.isLoading ? <Skeleton className="h-16" /> : auditQuery.data?.length ? (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {auditQuery.data.map((log) => <AuditRow key={log.id} log={log} />)}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem alterações registadas ainda.</p>
                    )}
                  </Card>
                </div>

                <div className="space-y-3">
                  <ImagePreview proposal={{ ...reviewing, ...draft } as Proposal} />
                  <MapPreview proposal={{ ...reviewing, ...cleanDraft(draft) } as Proposal} />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setReviewing(null)}>Fechar</Button>
                <Button variant="secondary" onClick={saveDraft} disabled={approve.isPending || reject.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Guardar
                </Button>
                <Button variant="destructive" onClick={() => reject.mutate({ id: reviewing.id, notes: String(draft.review_notes ?? '') })} disabled={approve.isPending || reject.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
                <Button onClick={async () => { const ok = await saveDraft(); if (ok) approve.mutate({ ...reviewing, ...cleanDraft(draft) } as Proposal); }} disabled={approve.isPending || reject.isPending}>
                  {approve.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Guardar e publicar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProposalCard({ proposal, selected, busy, onSelect, onReview, onApprove, onReject }: {
  proposal: Proposal;
  selected: boolean;
  busy: boolean;
  onSelect: (checked: boolean) => void;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const displayType = displayEntityType(proposal);
  const Icon = entityIcon[displayType] ?? MapPin;
  const canSelect = proposal.status === 'pending' || proposal.status === 'in_review';
  const validation = validateProposal(proposal);

  return (
    <Card className={cn('overflow-hidden relative', selected && 'border-primary border-2')}>
      {canSelect && (
        <div className="absolute top-2 right-2 z-10 bg-background/85 backdrop-blur rounded-md p-1">
          <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(Boolean(checked))} />
        </div>
      )}
      <div className="flex flex-col md:flex-row">
        <div className="md:w-44 md:h-auto h-34 bg-muted shrink-0 relative">
          {proposal.image_url ? <SafeImage src={getSafeImageUrl(proposal.image_url)} alt={proposal.name} className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
          )}
          <Badge className="absolute top-2 left-2 bg-background/85 backdrop-blur text-foreground border-0 text-[10px]">
            <Icon className="h-3 w-3 mr-1" /> {entityLabel[displayType]}
          </Badge>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight">{proposal.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <Badge variant="outline" className="text-[10px]">{proposal.source === 'google_places' ? 'Google Places' : 'Submissão de utilizador'}</Badge>
                <Badge variant={proposal.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">{proposal.status}</Badge>
                <span className="text-muted-foreground">{new Date(proposal.created_at).toLocaleString('pt-MZ')}</span>
              </div>
            </div>
            {canSelect && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={onReview}><Edit3 className="h-3.5 w-3.5 mr-1" /> Revisar</Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={onReject}><XCircle className="h-3.5 w-3.5" /></Button>
                <Button size="sm" disabled={busy || validation.blockers.length > 0} onClick={onApprove}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <Row label="Cidade">{proposal.city}</Row>
            <Row label="Telefone">{proposal.phone || <em className="text-muted-foreground">—</em>}</Row>
            <Row label="Coordenadas">{formatCoords(proposal) || <em className="text-muted-foreground">—</em>}</Row>
            <Row label="Morada"><span className="line-clamp-2">{proposal.address || '—'}</span></Row>
            <Row label="Imagem">{proposal.image_url ? <a href={proposal.image_url} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> abrir</a> : '—'}</Row>
            <Row label="Mapa">{proposal.latitude && proposal.longitude ? <a href={googleMapsUrl(proposal.latitude, proposal.longitude)} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> abrir</a> : '—'}</Row>
          </div>

          {validation.blockers.length > 0 ? (
            <div className="bg-destructive/10 border border-destructive/25 rounded-md p-2 text-[11px] text-destructive flex gap-2">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {validation.blockers[0]}
            </div>
          ) : validation.warnings.length > 0 ? (
            <div className="bg-warning/10 border border-warning/25 rounded-md p-2 text-[11px] text-warning flex gap-2">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {validation.warnings[0]}
            </div>
          ) : null}

          {proposal.source === 'user_submit' && (proposal.status === 'pending' || proposal.status === 'approved' || proposal.status === 'in_review') && (
            <div className="bg-gold/10 border border-gold/30 rounded p-2 text-[11px] flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-gold" />
              <span>Recompensa: <strong>+{proposal.reward_amount ?? 25} {proposal.reward_currency || 'MZN'}</strong> e <strong>+{proposal.reward_joy_coins ?? 50} 🪙</strong></span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ValidationPanel({ proposal }: { proposal: Proposal }) {
  const validation = validateProposal(proposal);
  const ok = validation.blockers.length === 0 && validation.warnings.length === 0;
  return (
    <Card className={cn('p-3 border', ok ? 'bg-primary/5 border-primary/25' : validation.blockers.length ? 'bg-destructive/10 border-destructive/25' : 'bg-warning/10 border-warning/25')}>
      <div className="flex items-center gap-2 mb-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <ShieldAlert className={cn('h-4 w-4', validation.blockers.length ? 'text-destructive' : 'text-warning')} />}
        <p className="font-semibold text-sm">Validações antes de aprovar</p>
      </div>
      <ul className="space-y-1 text-xs">
        {ok && <li>Dados mínimos e geolocalização parecem válidos.</li>}
        {validation.blockers.map((item) => <li key={item} className="text-destructive">• {item}</li>)}
        {validation.warnings.map((item) => <li key={item} className="text-warning">• {item}</li>)}
      </ul>
    </Card>
  );
}

function MapPreview({ proposal }: { proposal: Proposal }) {
  const lat = Number(proposal.latitude);
  const lng = Number(proposal.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return <Card className="p-6 text-sm text-muted-foreground text-center">Insere latitude e longitude para pré-visualizar no mapa.</Card>;
  }
  const delta = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <Card className="overflow-hidden">
      <div className="p-3 flex items-center justify-between gap-2">
        <p className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Preview no mapa</p>
        <a href={googleMapsUrl(lat, lng)} target="_blank" rel="noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1">Google Maps <ExternalLink className="h-3 w-3" /></a>
      </div>
      <iframe title={`Mapa de ${proposal.name}`} src={src} className="w-full h-72 border-0" loading="lazy" />
      <div className="p-3 text-xs text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)} · {proposal.address || proposal.city}</div>
    </Card>
  );
}

function ImagePreview({ proposal }: { proposal: Proposal }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-52 bg-muted flex items-center justify-center">
        {proposal.image_url ? <SafeImage src={getSafeImageUrl(proposal.image_url)} alt={proposal.name} className="w-full h-full object-cover" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
      </div>
      <div className="p-3 text-xs text-muted-foreground">Imagem pública usada na listagem após aprovação.</div>
    </Card>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const entries = Object.entries(log.changes ?? {});
  return (
    <div className="rounded-md border p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
        <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-MZ')}</span>
      </div>
      <div className="mt-1 space-y-0.5">
        {entries.slice(0, 6).map(([key, value]) => (
          <p key={key}><strong>{fieldLabel(key)}:</strong> {stringifyValue(value?.from)} → {stringifyValue(value?.to)}</p>
        ))}
        {entries.length > 6 && <p className="text-muted-foreground">+{entries.length - 6} alterações</p>}
      </div>
    </div>
  );
}

function CurationSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-5 gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-[10px] text-muted-foreground uppercase">{label}</Label><div className="text-foreground">{children}</div></div>;
}

function cleanDraft(draft: Partial<Proposal>) {
  return {
    name: String(draft.name ?? '').trim(),
    address: nullableText(draft.address),
    city: String(draft.city ?? '').trim(),
    neighborhood: nullableText(draft.neighborhood),
    reference_point: nullableText(draft.reference_point),
    phone: nullableText(draft.phone),
    website: nullableText(draft.website),
    description: nullableText(draft.description),
    image_url: nullableText(draft.image_url),
    review_notes: nullableText(draft.review_notes),
    latitude: parseCoordinate(draft.latitude),
    longitude: parseCoordinate(draft.longitude),
  };
}

function validateProposal(proposal: Proposal) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const lat = Number(proposal.latitude);
  const lng = Number(proposal.longitude);

  if (!proposal.name?.trim()) blockers.push('Nome é obrigatório.');
  if (!proposal.city?.trim()) blockers.push('Cidade é obrigatória.');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) blockers.push('Latitude e longitude válidas são obrigatórias antes de aprovar.');

  // Only show Mozambique specific warnings if the country is MZ
  const isMZ = proposal.raw_payload?.country_id === 'MZ' || (proposal as any).country_id === 'MZ';
  if (isMZ) {
    if (Number.isFinite(lat) && (lat < MZ_BOUNDS.minLat || lat > MZ_BOUNDS.maxLat)) warnings.push('Latitude parece fora de Moçambique — confirma no mapa antes de aprovar.');
    if (Number.isFinite(lng) && (lng < MZ_BOUNDS.minLng || lng > MZ_BOUNDS.maxLng)) warnings.push('Longitude parece fora de Moçambique — confirma no mapa antes de aprovar.');
  }

  if (!proposal.address?.trim()) warnings.push('Morada vazia: confirma visualmente no mapa antes de publicar.');
  if (!proposal.phone?.trim()) warnings.push('Telefone vazio: pode ser publicado, mas convém confirmar contacto depois.');
  if (proposal.image_url && !normalizeImageUrl(proposal.image_url)) blockers.push('Imagem deve ser uma URL pública ou um ficheiro válido no storage.');

  return { blockers, warnings };
}

function isLaboratoryProposal(proposal: Proposal) {
  const original = String(proposal.search_meta?.original_entity ?? '').toLowerCase();
  const text = `${proposal.name ?? ''} ${proposal.description ?? ''}`.toLowerCase();
  return proposal.entity_type === 'lab' || proposal.entity_type === 'laboratory' || original === 'laboratory' || text.includes('laborat');
}

function displayEntityType(proposal: Proposal): TypeFilter | 'doctor' | 'other' {
  if (isLaboratoryProposal(proposal)) return 'lab';
  const t = proposal.entity_type;
  if (t === 'pharmacy' || t === 'clinic' || t === 'hospital' || t === 'veterinary' || t === 'doctor') return t;
  return 'other';
}

function parseCoordinate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function nullableText(value: unknown) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function formatCoords(proposal: Proposal) {
  const lat = Number(proposal.latitude);
  const lng = Number(proposal.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function GeocodeButton({ draft, onResolved }: { draft: any; onResolved: (lat: number, lng: number, formatted?: string | null) => void }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    const address = String(draft.address ?? '').trim();
    const city = String(draft.city ?? '').trim();
    const name = String(draft.name ?? '').trim();
    if (!city && !address && !name) {
      toast.error('Preenche nome, morada ou cidade antes de geocodificar.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address, city, name },
      });
      if (error) throw error;
      if (!data?.latitude || !data?.longitude) {
        toast.error('Não foi possível encontrar coordenadas para este endereço.');
        return;
      }
      onResolved(Number(data.latitude), Number(data.longitude), data.formatted_address ?? null);
      toast.success(`Coordenadas preenchidas via ${data.source === 'places' ? 'Google Places' : 'Geocoding'}.`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao geocodificar.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button type="button" size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Locate className="h-4 w-4 mr-1" />}
      Geocodificar via Google
    </Button>
  );
}

function fieldLabel(key: string) {
  return ({
    name: 'Nome',
    address: 'Morada',
    city: 'Cidade',
    phone: 'Telefone',
    image_url: 'Imagem',
    latitude: 'Latitude',
    longitude: 'Longitude',
    description: 'Descrição',
    review_notes: 'Notas',
    status: 'Estado',
  } as Record<string, string>)[key] ?? key;
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80);
  return String(value).slice(0, 80);
}