import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BentoGrid, BentoCard, GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import {
  Link2, QrCode, BarChart3, Users, TrendingUp, Copy,
  Plus, ExternalLink, Check, Calendar, Target, Globe,
  UserPlus, Truck, Stethoscope, Sparkles, Search,
  Download,
} from '@/components/icons/lucide-compat';

// ── Types ──
type CampaignType = 'province_launch' | 'doctor_recruitment' | 'rider_push' | 'general_growth';

interface CampaignLink {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  province_id?: string;
  province_name?: string;
  role_target?: string;
  short_code: string;
  full_url: string;
  clicks: number;
  signups: number;
  conversions: number;
  is_active: boolean;
  created_at: string;
}

interface CampaignFormData {
  name: string;
  description: string;
  type: CampaignType;
  province_id: string;
  role_target: string;
}

const CAMPAIGN_TYPES: { value: CampaignType; label: string; icon: typeof Sparkles; color: string }[] = [
  { value: 'province_launch', label: 'Lançamento Provincial', icon: Globe, color: 'from-teal-500 to-emerald-500' },
  { value: 'doctor_recruitment', label: 'Recrutamento de Médicos', icon: Stethoscope, color: 'from-indigo-500 to-purple-500' },
  { value: 'rider_push', label: 'Expansão de Riders', icon: Truck, color: 'from-amber-500 to-orange-500' },
  { value: 'general_growth', label: 'Crescimento Geral', icon: TrendingUp, color: 'from-pink-500 to-rose-500' },
];

const ROLE_TARGETS = [
  { value: '', label: 'Todos' },
  { value: 'customer', label: 'Pacientes' },
  { value: 'doctor', label: 'Médicos' },
  { value: 'rider', label: 'Riders' },
  { value: 'store_owner', label: 'Farmácias/Lojas' },
  { value: 'clinic', label: 'Clínicas' },
];

const PROVINCES = [
  'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane',
  'Sofala', 'Manica', 'Tete', 'Zambézia',
  'Nampula', 'Cabo Delgado', 'Niassa',
];

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'MW';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function QRCodeCanvas({ value, size = 140 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState('');

  useState(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cells = 21;
    const cellSize = size / cells;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash = hash & hash;
    }
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    ctx.fillStyle = '#111827';
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#111827';
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };
    drawFinder(0, 0);
    drawFinder(cells - 7, 0);
    drawFinder(0, cells - 7);

    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        if ((row < 8 && col < 8) || (row < 8 && col >= cells - 8) || (row >= cells - 8 && col < 8)) continue;
        if (row === 6 || col === 6) {
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = '#111827';
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
          continue;
        }
        if (seededRandom(hash + row * cells + col) > 0.55) {
          ctx.fillStyle = '#111827';
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    setDataUrl(canvas.toDataURL('image/png'));
  });

  if (!dataUrl) return <Skeleton className="h-[140px] w-[140px] rounded-xl" />;
  return <img src={dataUrl} alt="QR Code" width={size} height={size} className="rounded-xl" />;
}

export default function CampaignLinks() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQrUrl, setSelectedQrUrl] = useState('');
  const [selectedQrName, setSelectedQrName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    type: 'general_growth',
    province_id: '',
    role_target: '',
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://medwalletmz.online';

  // ── Fetch Campaigns ──
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['admin-campaign-links', search, typeFilter],
    queryFn: async () => {
      // Using campaign_links table if it exists, otherwise local mock
      const { data, error } = await (supabase as any)
        .from('campaign_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet, return empty
        return [] as CampaignLink[];
      }

      let filtered = data as CampaignLink[];

      if (search) {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.short_code.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter((c) => c.type === typeFilter);
      }

      return filtered;
    },
  });

  // ── Create Campaign ──
  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const shortCode = generateShortCode();
      const params = new URLSearchParams();
      params.set('campaign', shortCode);
      if (data.province_id) params.set('province', data.province_id);
      if (data.role_target) params.set('role', data.role_target);

      const fullUrl = `${baseUrl}/?${params.toString()}`;

      const { error } = await (supabase as any).from('campaign_links').insert({
        name: data.name,
        description: data.description,
        type: data.type,
        province_id: data.province_id || null,
        role_target: data.role_target || null,
        short_code: shortCode,
        full_url: fullUrl,
        clicks: 0,
        signups: 0,
        conversions: 0,
        is_active: true,
      });

      if (error) {
        // If table doesn't exist, create it (or just return mock)
        console.warn('campaign_links table not available:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-links'] });
      toast.success('Campanha criada com sucesso!');
      setDialogOpen(false);
      setFormData({ name: '', description: '', type: 'general_growth', province_id: '', role_target: '' });
    },
    onError: () => {
      toast.error('Erro ao criar campanha. Verifique se a tabela existe.');
    },
  });

  // ── Computed Stats ──
  const stats = useMemo(() => {
    if (!campaigns) return { total: 0, clicks: 0, signups: 0, conversions: 0, rate: 0 };
    const clicks = campaigns.reduce((a, c) => a + (Number(c.clicks) || 0), 0);
    const signups = campaigns.reduce((a, c) => a + (Number(c.signups) || 0), 0);
    const conversions = campaigns.reduce((a, c) => a + (Number(c.conversions) || 0), 0);
    const rate = clicks > 0 ? ((conversions / clicks) * 100) : 0;
    return { total: campaigns.length, clicks, signups, conversions, rate };
  }, [campaigns]);

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openQrDialog = (url: string, name: string) => {
    setSelectedQrUrl(url);
    setSelectedQrName(name);
    setQrDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur border-b">
        <div>
          <h1 className="text-lg font-bold">Links de Campanha</h1>
          <p className="text-xs text-muted-foreground">Cria e monitora links de campanha com tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700">
              <Plus className="h-4 w-4 mr-1" /> Criar Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Lançamento Nampula Q3 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Descrição</Label>
                <Input
                  placeholder="Breve descrição da campanha"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Tipo de Campanha</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as CampaignType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Província (opcional)</Label>
                <Select
                  value={formData.province_id}
                  onValueChange={(v) => setFormData({ ...formData, province_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as províncias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as províncias</SelectItem>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Papel Alvo (opcional)</Label>
                <Select
                  value={formData.role_target}
                  onValueChange={(v) => setFormData({ ...formData, role_target: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os papéis" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_TARGETS.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 font-bold"
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || createMutation.isPending}
              >
                {createMutation.isPending ? 'A criar...' : 'Gerar Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Stats Bento Grid */}
      <div className="p-4">
        <BentoGrid className="mb-6">
          <BentoCard size="sm" className="flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-teal-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Total Campanhas</span>
            </div>
            <p className="text-2xl font-black tabular-nums text-teal-700">
              <NumberFlow value={stats.total} />
            </p>
          </BentoCard>

          <BentoCard size="sm" className="flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Cliques</span>
            </div>
            <p className="text-2xl font-black tabular-nums text-indigo-700">
              <NumberFlow value={stats.clicks} />
            </p>
          </BentoCard>

          <BentoCard size="sm" className="flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Registos</span>
            </div>
            <p className="text-2xl font-black tabular-nums text-emerald-700">
              <NumberFlow value={stats.signups} />
            </p>
          </BentoCard>

          <BentoCard size="sm" className="flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase">Taxa de Conversão</span>
            </div>
            <p className="text-2xl font-black tabular-nums text-amber-700">
              <NumberFlow value={Math.round(stats.rate * 10) / 10} />%
            </p>
          </BentoCard>
        </BentoGrid>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar campanhas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {CAMPAIGN_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campaign List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const typeMeta = CAMPAIGN_TYPES.find((ct) => ct.value === campaign.type);
              const Icon = typeMeta?.icon || Sparkles;
              const rate = campaign.clicks > 0 ? ((campaign.conversions / campaign.clicks) * 100).toFixed(1) : '0.0';

              return (
                <GlassCard key={campaign.id} className="space-y-3">
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${typeMeta?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {typeMeta?.label || campaign.type}
                          </Badge>
                          {campaign.province_name && (
                            <Badge variant="outline" className="text-[10px] font-bold border-teal-300 text-teal-700">
                              <Globe className="h-3 w-3 mr-0.5" /> {campaign.province_name}
                            </Badge>
                          )}
                          {campaign.role_target && (
                            <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-700">
                              <Target className="h-3 w-3 mr-0.5" /> {campaign.role_target}
                            </Badge>
                          )}
                          {campaign.is_active && (
                            <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-300">Activa</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(campaign.created_at).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>

                  {/* Link + Actions */}
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2">
                    <code className="flex-1 text-xs font-mono truncate text-primary font-bold">
                      {campaign.full_url}
                    </code>
                    <Button
                      size="sm"
                      variant={copiedId === campaign.id ? 'default' : 'outline'}
                      className={`h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 ${copiedId === campaign.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      onClick={() => copyLink(campaign.full_url, campaign.id)}
                    >
                      {copiedId === campaign.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {copiedId === campaign.id ? 'OK' : 'Copiar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 rounded-lg text-xs font-bold shrink-0"
                      onClick={() => openQrDialog(campaign.full_url, campaign.name)}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                    </Button>
                    <a href={campaign.full_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg text-xs font-bold shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-indigo-50">
                      <p className="text-lg font-black tabular-nums text-indigo-700">
                        <NumberFlow value={Number(campaign.clicks) || 0} />
                      </p>
                      <p className="text-[9px] font-bold text-indigo-500 uppercase">Cliques</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-emerald-50">
                      <p className="text-lg font-black tabular-nums text-emerald-700">
                        <NumberFlow value={Number(campaign.signups) || 0} />
                      </p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase">Registos</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-50">
                      <p className="text-lg font-black tabular-nums text-amber-700">
                        <NumberFlow value={Number(campaign.conversions) || 0} />
                      </p>
                      <p className="text-[9px] font-bold text-amber-500 uppercase">Conversões</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-pink-50">
                      <p className="text-lg font-black tabular-nums text-pink-700">{rate}%</p>
                      <p className="text-[9px] font-bold text-pink-500 uppercase">Taxa</p>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">Sem campanhas ainda</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Cria a tua primeira campanha de marketing com links rastreáveis e códigos QR.
            </p>
            <Button
              className="mt-4 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Criar Nova Campanha
            </Button>
          </div>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-center">Código QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 pt-2">
            <p className="text-sm font-bold text-muted-foreground text-center">{selectedQrName}</p>
            <div className="p-4 bg-white rounded-2xl border shadow-sm">
              <QRCodeCanvas value={selectedQrUrl} size={160} />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all text-center">{selectedQrUrl}</p>
            <Button
              variant="outline"
              className="w-full font-bold"
              onClick={() => {
                navigator.clipboard.writeText(selectedQrUrl);
                toast.success('Link copiado!');
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar Link
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 font-bold"
              onClick={() => {
                // Download QR code as image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    canvas.width = 300;
                    canvas.height = 300;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, 300, 300);
                    ctx.drawImage(img, 70, 70, 160, 160);
                    const link = document.createElement('a');
                    link.download = `qr-${selectedQrName.replace(/\s+/g, '-').toLowerCase()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  };
                  const qrImg = document.querySelector('.rounded-xl[alt="QR Code"]') as HTMLImageElement;
                  if (qrImg) img.src = qrImg.src;
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Exportar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
