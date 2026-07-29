import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText, AlertTriangle, Megaphone, Lightbulb,
  Plus, X, ChevronDown,
} from "@/components/icons/lucide-compat";
import {
  GlassCard,
} from '@/components/ui/design-system';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type ContentType = 'alert' | 'campaign' | 'tip';
type Priority = 'high' | 'medium' | 'low';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  priority: Priority;
  province: string;
  created_at: string;
  is_active: boolean;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const typeConfig: Record<ContentType, { icon: typeof AlertTriangle; color: string; bgColor: string; label: string }> = {
  alert: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Alerta' },
  campaign: { icon: Megaphone, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Campanha' },
  tip: { icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Dica' },
};

export default function RegionalContent() {
  const { province } = useProvince();
  const { t } = useCountry();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ContentType>('alert');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');

  useEffect(() => {
    loadContent();
  }, [province]);

  const loadContent = async () => {
    if (!province) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from('province_content')
      .select('*')
      .eq('province', province.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setContentItems((data || []) as ContentItem[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!province) return;
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Preenche o título e a descrição');
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase as any)
      .from('province_content')
      .insert({
        title: formTitle.trim(),
        description: formDescription.trim(),
        type: formType,
        priority: formPriority,
        province: province.id,
        is_active: true,
      });

    if (error) {
      toast.error('Erro ao publicar conteúdo');
    } else {
      toast.success('Conteúdo publicado com sucesso');
      setFormTitle('');
      setFormDescription('');
      setFormPriority('medium');
      setShowForm(false);
      loadContent();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('province_content')
      .delete()
      .eq('id', id);

    if (!error) {
      setContentItems(prev => prev.filter(c => c.id !== id));
      toast.success('Conteúdo removido');
    }
  };

  const toggleActive = async (item: ContentItem) => {
    const { error } = await (supabase as any)
      .from('province_content')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (!error) {
      setContentItems(prev =>
        prev.map(c => c.id === item.id ? { ...c, is_active: !c.is_active } : c)
      );
    }
  };

  const filteredItems = filterType === 'all'
    ? contentItems
    : contentItems.filter(c => c.type === filterType);

  const quickCreate = (type: ContentType) => {
    setFormType(type);
    setShowForm(true);
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">{t('regional.content_title') || 'Conteúdo da Província'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('regional.content_subtitle') || 'Alertas, campanhas e dicas de saúde regional'}
          {province ? ` — ${province.name}` : ''}
        </p>
      </motion.div>

      {/* Quick Create Buttons */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => quickCreate('alert')}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {t('regional.create_alert') || 'Criar Alerta'}
        </Button>
        <Button size="sm" variant="secondary" className="gap-1.5 shrink-0" onClick={() => quickCreate('campaign')}>
          <Megaphone className="h-3.5 w-3.5" />
          {t('regional.create_campaign') || 'Criar Campanha'}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => quickCreate('tip')}>
          <Lightbulb className="h-3.5 w-3.5" />
          {t('regional.create_tip') || 'Criar Dica'}
        </Button>
      </motion.div>

      {/* Content Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <GlassCard className="!p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Conteúdo
                </h3>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{t('regional.content_form_title') || 'Título'}</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Título do conteúdo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('regional.content_form_description') || 'Descrição'}</Label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descrição detalhada..."
                    rows={3}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('regional.content_form_type') || 'Tipo'}</Label>
                    <div className="relative mt-1">
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ContentType)}
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm appearance-none pr-8"
                      >
                        <option value="alert">Alerta</option>
                        <option value="campaign">Campanha</option>
                        <option value="tip">Dica</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('regional.content_form_priority') || 'Prioridade'}</Label>
                    <div className="relative mt-1">
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as Priority)}
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm appearance-none pr-8"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'A publicar...' : t('regional.content_form_submit') || 'Publicar'}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type Filter */}
      <motion.div variants={fadeUp} className="flex gap-2">
        {(['all', 'alert', 'campaign', 'tip'] as const).map(ft => (
          <Button
            key={ft}
            variant={filterType === ft ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => setFilterType(ft)}
          >
            {ft === 'all' ? (t('regional.filter_all') || 'Todos') :
             ft === 'alert' ? 'Alertas' :
             ft === 'campaign' ? 'Campanhas' : 'Dicas'}
          </Button>
        ))}
      </motion.div>

      {/* Content List */}
      {filteredItems.length === 0 ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'A carregar...' : 'Sem conteúdo publicado'}
            </p>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-2 max-h-96 overflow-y-auto">
          {filteredItems.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            return (
              <GlassCard key={item.id} className={`!p-3 ${!item.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${config.bgColor} ${config.color} border-0`}
                      >
                        {config.label}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          item.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                          item.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        } border-0`}
                      >
                        {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(item.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 w-7 p-0 ${item.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                      onClick={() => toggleActive(item)}
                      title={item.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {item.is_active ? <X className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDelete(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
