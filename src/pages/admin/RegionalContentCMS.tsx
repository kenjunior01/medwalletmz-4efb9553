/**
 * Regional Content CMS — Manage per-country health campaigns
 *
 * Features:
 *  - Country selector (with flags)
 *  - Metrics dashboard (total, active, pinned, views, clicks, by type)
 *  - Content list with type badges, status (live/scheduled/expired), pinned indicator
 *  - Create/Edit wizard: type → basics → targeting → schedule → review
 *  - Quick actions: pin/unpin, activate/deactivate, delete
 *  - Filter by type
 *  - Skeleton/empty/error states
 *  - WCAG 2.1 AA
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Edit3, Trash2, Pin, PinOff, Power, PowerOff, Eye,
  MousePointer, AlertTriangle, X, Clock, Calendar, Globe, Tag,
  ChevronRight, Sparkles, ExternalLink, Image as ImageIcon, Save, Check,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import {
  RegionalContent, ContentType, ContentMetrics,
  getContent, createContent, updateContent, deleteContent,
  togglePinned, toggleActive, getContentMetrics, recordView, recordClick,
  CONTENT_TYPE_LABELS, AUDIENCE_TAG_OPTIONS, COUNTRY_OPTIONS,
  isContentLive, formatContentType,
} from '@/services/regionalContent';

type View = 'list' | 'edit';

interface EditForm {
  id?: string;
  country_code: string;
  content_type: ContentType;
  title: string;
  description: string;
  body_text: string;
  audience_tags: string[];
  language: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_pinned: boolean;
  image_url: string;
  accent_color: string;
  cta_label: string;
  cta_url: string;
}

const ACCENT_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function RegionalContentCMS() {
  const { t, user } = useCountry();
  const [countryCode, setCountryCode] = useState('MZ');
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<RegionalContent[]>([]);
  const [metrics, setMetrics] = useState<ContentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, m] = await Promise.all([
        getContent(countryCode, { includeInactive: true }),
        getContentMetrics(countryCode).catch(() => null),
      ]);
      setItems(items);
      setMetrics(m);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({
      country_code: countryCode,
      content_type: 'health_campaign',
      title: '',
      description: '',
      body_text: '',
      audience_tags: [],
      language: 'pt',
      starts_at: '',
      ends_at: '',
      is_active: true,
      is_pinned: false,
      image_url: '',
      accent_color: '#3B82F6',
      cta_label: '',
      cta_url: '',
    });
    setView('edit');
  };

  const openEdit = (item: RegionalContent) => {
    setForm({
      id: item.id,
      country_code: item.country_code,
      content_type: item.content_type,
      title: item.title,
      description: item.description ?? '',
      body_text: (item.content_body as any)?.text ?? '',
      audience_tags: item.audience_tags ?? [],
      language: item.language ?? 'pt',
      starts_at: item.starts_at ? item.starts_at.slice(0, 16) : '',
      ends_at: item.ends_at ? item.ends_at.slice(0, 16) : '',
      is_active: item.is_active ?? true,
      is_pinned: item.is_pinned ?? false,
      image_url: item.image_url ?? '',
      accent_color: item.accent_color ?? '#3B82F6',
      cta_label: item.cta_label ?? '',
      cta_url: item.cta_url ?? '',
    });
    setView('edit');
  };

  const handleSave = async () => {
    if (!form || !user?.id || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Omit<RegionalContent, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'views_count' | 'clicks_count'> = {
        country_code: form.country_code,
        content_type: form.content_type,
        title: form.title.trim(),
        description: form.description || undefined,
        content_body: form.body_text ? { text: form.body_text } : {},
        audience_tags: form.audience_tags,
        language: form.language,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
        is_active: form.is_active,
        is_pinned: form.is_pinned,
        image_url: form.image_url || undefined,
        accent_color: form.accent_color,
        cta_label: form.cta_label || undefined,
        cta_url: form.cta_url || undefined,
      };
      if (form.id) {
        await updateContent(form.id, payload);
      } else {
        await createContent(user.id, payload);
      }
      await load();
      setView('list');
      setForm(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apagar "${title}"? Esta acção não pode ser desfeita.`)) return;
    try {
      await deleteContent(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao apagar');
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    try {
      await togglePinned(id, !pinned);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await toggleActive(id, !active);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    }
  };

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((i) => i.content_type === typeFilter);
  }, [items, typeFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Megaphone className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('regionalContent.title') ?? 'Conteúdo Regional'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('regionalContent.subtitle') ?? 'CMS por país'}</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{t('regionalContent.create') ?? 'Novo conteúdo'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto" aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {/* Country selector */}
              <div className="mb-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
                <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden />
                <label className="text-sm text-slate-600" htmlFor="country-select">{t('regionalContent.country') ?? 'País'}:</label>
                <select
                  id="country-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Metrics */}
              {metrics && <MetricsGrid metrics={metrics} t={t} />}

              {/* Type filter */}
              <div className="mt-6 mb-3 flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label={t('regionalContent.filterType') ?? 'Filtrar por tipo'}>
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-full transition ${typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  role="radio" aria-checked={typeFilter === 'all'}
                >
                  {t('regionalContent.all') ?? 'Todos'} ({metrics?.total ?? 0})
                </button>
                {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((tp) => {
                  const cfg = CONTENT_TYPE_LABELS[tp];
                  const count = metrics?.by_type[tp] ?? 0;
                  return (
                    <button
                      key={tp}
                      onClick={() => setTypeFilter(tp)}
                      className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition ${typeFilter === tp ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      style={typeFilter === tp ? { background: cfg.color } : {}}
                      role="radio" aria-checked={typeFilter === tp}
                    >
                      <span>{cfg.emoji}</span>
                      <span className="hidden sm:inline">{cfg.label}</span>
                      <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Content list */}
              {loading ? (
                <div className="space-y-3" role="status" aria-busy="true" aria-live="polite">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState onCreate={openCreate} t={t} />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((item, idx) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id!, item.title)}
                      onTogglePin={() => handleTogglePin(item.id!, !!item.is_pinned)}
                      onToggleActive={() => handleToggleActive(item.id!, !!item.is_active)}
                      onView={() => recordView(item.id!)}
                      onClick={() => recordClick(item.id!)}
                      t={t}
                    />
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {view === 'edit' && form && (
            <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <EditForm
                form={form}
                setForm={setForm}
                onSave={handleSave}
                onCancel={() => { setView('list'); setForm(null); }}
                saving={saving}
                t={t}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------- Metrics ---------- */

function MetricsGrid({ metrics, t }: { metrics: ContentMetrics; t: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      <MetricTile label={t('regionalContent.total') ?? 'Total'} value={metrics.total} color="bg-slate-100 text-slate-700" />
      <MetricTile label={t('regionalContent.active') ?? 'Activo'} value={metrics.active} color="bg-emerald-50 text-emerald-700" />
      <MetricTile label={t('regionalContent.pinned') ?? 'Fixado'} value={metrics.pinned} color="bg-amber-50 text-amber-700" />
      <MetricTile label={t('regionalContent.views') ?? 'Visualizações'} value={metrics.total_views} icon={<Eye className="w-3 h-3" />} color="bg-blue-50 text-blue-700" />
      <MetricTile label={t('regionalContent.clicks') ?? 'Cliques'} value={metrics.total_clicks} icon={<MousePointer className="w-3 h-3" />} color="bg-violet-50 text-violet-700" />
    </motion.div>
  );
}

function MetricTile({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="text-xs font-medium opacity-80 mb-1 flex items-center gap-1">{icon}{label}</div>
      <div className="text-xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

/* ---------- Content card ---------- */

function ContentCard({ item, index, onEdit, onDelete, onTogglePin, onToggleActive, onView, onClick, t }: {
  item: RegionalContent; index: number;
  onEdit: () => void; onDelete: () => void;
  onTogglePin: () => void; onToggleActive: () => void;
  onView: () => void; onClick: () => void; t: any;
}) {
  const cfg = CONTENT_TYPE_LABELS[item.content_type];
  const live = isContentLive(item);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
    >
      <div className="h-1" style={{ background: item.accent_color ?? cfg.color }} aria-hidden />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${cfg.color}20` }}
            aria-hidden
          >
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
              {item.is_pinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Pin className="w-2.5 h-2.5" /> {t('regionalContent.pinned') ?? 'Fixado'}
                </span>
              )}
              <StatusBadge item={item} live={live} t={t} />
            </div>
            {item.description && <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>}
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{item.views_count ?? 0}</span>
              <span className="inline-flex items-center gap-1"><MousePointer className="w-3 h-3" />{item.clicks_count ?? 0}</span>
              {item.starts_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.starts_at).toLocaleDateString()}
                </span>
              )}
              {item.audience_tags && item.audience_tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {item.audience_tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Edit3 className="w-3 h-3" /> {t('common.edit') ?? 'Editar'}
          </button>
          <button
            onClick={onTogglePin}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              item.is_pinned ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            {item.is_pinned ? (t('regionalContent.unpin') ?? 'Desafixar') : (t('regionalContent.pin') ?? 'Fixar')}
          </button>
          <button
            onClick={onToggleActive}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
            {item.is_active ? (t('regionalContent.deactivate') ?? 'Desactivar') : (t('regionalContent.activate') ?? 'Activar')}
          </button>
          {item.cta_url && (
            <a
              href={item.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 hover:bg-blue-100"
            >
              <ExternalLink className="w-3 h-3" /> {item.cta_label ?? 'Abrir'}
            </a>
          )}
          <button
            onClick={onDelete}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={t('common.delete') ?? 'Apagar'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}

function StatusBadge({ item, live, t }: { item: RegionalContent; live: boolean; t: any }) {
  if (!item.is_active) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{t('regionalContent.inactive') ?? 'Inactivo'}</span>;
  }
  const now = new Date();
  if (item.starts_at && new Date(item.starts_at) > now) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{t('regionalContent.scheduled') ?? 'Agendado'}</span>;
  }
  if (item.ends_at && new Date(item.ends_at) < now) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{t('regionalContent.expired') ?? 'Expirado'}</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{t('regionalContent.live') ?? 'No ar'}</span>;
}

/* ---------- Edit form ---------- */

function EditForm({ form, setForm, onSave, onCancel, saving, t }: {
  form: EditForm; setForm: (f: EditForm) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; t: any;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{form.id ? (t('regionalContent.editTitle') ?? 'Editar conteúdo') : (t('regionalContent.createTitle') ?? 'Novo conteúdo')}</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Fechar"><X className="w-4 h-4" /></button>
      </div>

      {/* Country + type */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.country') ?? 'País'}</span>
          <select
            value={form.country_code}
            onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.type') ?? 'Tipo'}</span>
          <select
            value={form.content_type}
            onChange={(e) => setForm({ ...form, content_type: e.target.value as ContentType })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((tp) => (
              <option key={tp} value={tp}>{CONTENT_TYPE_LABELS[tp].emoji} {CONTENT_TYPE_LABELS[tp].label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.titleLabel') ?? 'Título'} <span className="text-red-500">*</span></span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={120}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          placeholder="Campanha de vacinação contra o cólera"
        />
      </label>

      {/* Description */}
      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.descriptionLabel') ?? 'Descrição curta'}</span>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={200}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          placeholder="Vacinação gratuita em todas as unidades de saúde"
        />
      </label>

      {/* Body */}
      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.bodyLabel') ?? 'Conteúdo completo'}</span>
        <textarea
          value={form.body_text}
          onChange={(e) => setForm({ ...form, body_text: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          placeholder="Detalhes da campanha, públicos-alvo, datas, locais..."
        />
      </label>

      {/* Audience tags */}
      <div>
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.audience') ?? 'Público-alvo'}</span>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCE_TAG_OPTIONS.map((tag) => {
            const selected = form.audience_tags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => setForm({
                  ...form,
                  audience_tags: selected
                    ? form.audience_tags.filter((t) => t !== tag)
                    : [...form.audience_tags, tag],
                })}
                className={`text-xs px-2 py-1 rounded-full border transition ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.startsAt') ?? 'Início'}</span>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.endsAt') ?? 'Fim'}</span>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.ctaLabel') ?? 'Botão (texto)'}</span>
          <input
            type="text"
            value={form.cta_label}
            onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
            placeholder="Saber mais"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.ctaUrl') ?? 'Botão (URL)'}</span>
          <input
            type="url"
            value={form.cta_url}
            onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      {/* Image + accent */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.imageUrl') ?? 'URL da imagem'}</span>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <div>
          <span className="text-sm font-medium text-slate-700 block mb-1">{t('regionalContent.accentColor') ?? 'Cor de destaque'}</span>
          <div className="flex gap-2">
            {ACCENT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, accent_color: c })}
                className={`w-8 h-8 rounded-full border-2 ${form.accent_color === c ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {t('regionalContent.active') ?? 'Activo'}
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_pinned}
            onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          {t('regionalContent.pinned') ?? 'Fixar no topo'}
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {t('common.cancel') ?? 'Cancelar'}
        </button>
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {saving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {form.id ? (t('common.save') ?? 'Guardar') : (t('common.create') ?? 'Criar')}
        </button>
      </div>
    </form>
  );
}

/* ---------- Empty ---------- */

function EmptyState({ onCreate, t }: { onCreate: () => void; t: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center mx-auto mb-4">
        <Megaphone className="w-10 h-10 text-blue-500" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('regionalContent.emptyTitle') ?? 'Ainda sem conteúdo'}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        {t('regionalContent.emptyBody') ?? 'Crie a primeira campanha de saúde, aviso de emergência, ou destaque de parceiro para este país.'}
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <Plus className="w-4 h-4" /> {t('regionalContent.createFirst') ?? 'Criar primeiro conteúdo'}
      </button>
    </motion.div>
  );
}
