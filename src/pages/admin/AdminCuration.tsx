import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, Edit3, Save, X, Loader2, Image as ImageIcon,
  Store, Building2, MapPin, ExternalLink, Sparkles, User as UserIcon,
  Award, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Proposal = {
  id: string;
  source: 'google_places' | 'user_submit';
  entity_type: 'pharmacy' | 'clinic' | 'hospital' | 'doctor' | 'lab' | 'other';
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
  reward_mzn: number | null;
  reward_joy_coins: number | null;
  reward_paid: boolean | null;
  review_notes: string | null;
  created_at: string;
  raw_payload: any;
  search_meta: any;
  proposed_by: string | null;
};

const entityIcon = {
  pharmacy: Store,
  clinic: Building2,
  hospital: Building2,
  doctor: UserIcon,
  lab: Hash,
  other: MapPin,
};

const entityLabel = {
  pharmacy: 'Farmácia',
  clinic: 'Clínica',
  hospital: 'Hospital',
  doctor: 'Médico',
  lab: 'Laboratório',
  other: 'Outro',
};

export default function AdminCuration() {
  const navigate = useNavigate();
  const { hasRole, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'in_review' | 'approved' | 'rejected' | 'all'>('pending');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'google_places' | 'user_submit'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Proposal>>({});

  if (!loading && !hasRole('admin')) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Acesso restrito.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/bootstrap')}>
          Bootstrap admin
        </Button>
      </div>
    );
  }

  const { data: stats } = useQuery({
    queryKey: ['curation-stats'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('place_proposals')
        .select('status');
      const tally: Record<string, number> = {};
      (data || []).forEach((r: any) => { tally[r.status] = (tally[r.status] || 0) + 1; });
      return tally;
    },
  });

  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ['curation-proposals', tab, sourceFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from('place_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (tab !== 'all') q = q.eq('status', tab);
      if (sourceFilter !== 'all') q = q.eq('source', sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Proposal[];
    },
  });

  const startEdit = (p: Proposal) => {
    setEditing(p.id);
    setDraft(p);
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
  };

  const saveDraft = async () => {
    if (!editing) return;
    const update = {
      name: draft.name,
      address: draft.address,
      city: draft.city,
      neighborhood: draft.neighborhood,
      reference_point: draft.reference_point,
      phone: draft.phone,
      website: draft.website,
      description: draft.description,
      image_url: draft.image_url,
      latitude: draft.latitude ? Number(draft.latitude) : null,
      longitude: draft.longitude ? Number(draft.longitude) : null,
    };
    const { error } = await (supabase as any)
      .from('place_proposals')
      .update(update)
      .eq('id', editing);
    if (error) return toast.error(error.message);
    toast.success('Editado');
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('approve_proposal', { p_id: id, p_notes: null });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const rewarded = data?.reward_paid ? ' · reward paga!' : '';
      toast.success(`Publicado! ${data?.publish_target ?? ''}${rewarded}`);
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('reject_proposal', { p_id: id, p_notes: 'Rejeitado pelo admin' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Rejeitado');
      queryClient.invalidateQueries({ queryKey: ['curation-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Curadoria de Locais
          </h1>
          <p className="text-muted-foreground text-sm">
            Resultados do Google Places e submissões de utilizadores — revê e aprova antes de publicar.
          </p>
        </div>
        <Link to="/admin/import" className="text-xs text-primary underline">
          ← Voltar ao Import
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { key: 'pending',   label: 'Pendentes',    tone: 'bg-warning/15 text-warning' },
          { key: 'in_review', label: 'Em revisão',   tone: 'bg-secondary/15 text-secondary' },
          { key: 'approved',  label: 'Aprovadas',    tone: 'bg-primary/15 text-primary' },
          { key: 'rejected',  label: 'Rejeitadas',   tone: 'bg-destructive/15 text-destructive' },
          { key: 'duplicate', label: 'Duplicadas',   tone: 'bg-muted text-muted-foreground' },
        ].map((s) => (
          <Card key={s.key} className={cn('p-3 text-center border-0', s.tone)}>
            <p className="text-2xl font-black">{stats?.[s.key] ?? 0}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="in_review">Em revisão</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            <TabsTrigger value="all">Tudo</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">Todas origens</TabsTrigger>
            <TabsTrigger value="google_places">Google Places</TabsTrigger>
            <TabsTrigger value="user_submit">Utilizadores</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-sm">
          Nada por aqui nesta categoria. ✅
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const Icon = entityIcon[p.entity_type] ?? MapPin;
            const isEditing = editing === p.id;
            return (
              <Card key={p.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Foto */}
                  <div className="md:w-40 md:h-auto h-32 bg-muted shrink-0 relative">
                    {(isEditing ? draft.image_url : p.image_url) ? (
                      <img
                        src={(isEditing ? draft.image_url : p.image_url) as string}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur text-foreground border-0 text-[10px]">
                      <Icon className="h-3 w-3 mr-1" />
                      {entityLabel[p.entity_type]}
                    </Badge>
                  </div>

                  {/* Corpo */}
                  <div className="flex-1 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input
                            value={draft.name ?? ''}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="font-bold text-base"
                          />
                        ) : (
                          <p className="font-bold text-base">{p.name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {p.source === 'google_places' ? 'Google Places' : 'Submissão de utilizador'}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(p.created_at).toLocaleString('pt-MZ')}
                          </span>
                          {p.source === 'user_submit' && p.reward_paid && (
                            <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px]">
                              <Award className="h-3 w-3 mr-1" /> reward paga
                            </Badge>
                          )}
                        </div>
                      </div>

                      {!isEditing && (p.status === 'pending' || p.status === 'in_review') && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={reject.isPending}
                            onClick={() => reject.mutate(p.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(p.id)}
                          >
                            {approve.isPending
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar</>}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Campos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <Row label="Cidade">
                        {isEditing ? (
                          <Input
                            value={draft.city ?? ''}
                            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                          />
                        ) : p.city}
                      </Row>
                      <Row label="Bairro / referência">
                        {isEditing ? (
                          <Input
                            value={draft.neighborhood ?? draft.reference_point ?? ''}
                            onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value, reference_point: e.target.value })}
                            placeholder="ex: Polana C, perto do mercado"
                          />
                        ) : (
                          p.neighborhood || p.reference_point || <em className="text-muted-foreground">—</em>
                        )}
                      </Row>
                      <Row label="Endereço">
                        {isEditing ? (
                          <Input
                            value={draft.address ?? ''}
                            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                          />
                        ) : p.address || <em className="text-muted-foreground">—</em>}
                      </Row>
                      <Row label="Telefone">
                        {isEditing ? (
                          <Input
                            value={draft.phone ?? ''}
                            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                          />
                        ) : p.phone || <em className="text-muted-foreground">—</em>}
                      </Row>
                      <Row label="Lat / Lng">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Input
                              value={draft.latitude ?? ''}
                              onChange={(e) => setDraft({ ...draft, latitude: e.target.value as any })}
                              placeholder="lat"
                            />
                            <Input
                              value={draft.longitude ?? ''}
                              onChange={(e) => setDraft({ ...draft, longitude: e.target.value as any })}
                              placeholder="lng"
                            />
                          </div>
                        ) : (
                          p.latitude && p.longitude
                            ? `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`
                            : <em className="text-muted-foreground">—</em>
                        )}
                      </Row>
                      <Row label="Imagem URL">
                        {isEditing ? (
                          <Input
                            value={draft.image_url ?? ''}
                            onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                          />
                        ) : p.image_url ? (
                          <a href={p.image_url} target="_blank" rel="noreferrer" className="text-primary underline truncate inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> abrir
                          </a>
                        ) : <em className="text-muted-foreground">—</em>}
                      </Row>
                    </div>

                    {/* Descrição */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase">Notas</Label>
                      {isEditing ? (
                        <Textarea
                          rows={2}
                          value={draft.description ?? ''}
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        />
                      ) : (
                        <p className="text-xs">{p.description || <em className="text-muted-foreground">—</em>}</p>
                      )}
                    </div>

                    {/* Reward info */}
                    {p.source === 'user_submit' && (p.status === 'pending' || p.status === 'approved' || p.status === 'in_review') && (
                      <div className="bg-gold/10 border border-gold/30 rounded p-2 text-[11px] flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 text-gold" />
                        <span>
                          Recompensa ao propor: <strong>+{p.reward_mzn ?? 25} MZN</strong> e <strong>+{p.reward_joy_coins ?? 50} 🪙</strong>
                        </span>
                      </div>
                    )}

                    {/* Edit actions */}
                    {isEditing && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" onClick={saveDraft}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Guardar alterações
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      </div>
                    )}

                    {/* Status badge */}
                    {p.status !== 'pending' && (
                      <Badge
                        variant={p.status === 'approved' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase">{label}</Label>
      <div className="text-foreground">{children}</div>
    </div>
  );
}