/**
 * Support Circles — Peer-to-peer groups by condition
 *
 * Features:
 *  - Discover: browse circles by condition tag (12 conditions)
 *  - My circles: groups the user is in (with last message preview)
 *  - Circle detail: chat with messages, anonymous toggle, reply
 *  - AI moderation banner when message is flagged
 *  - Crisis resources popup when self-harm detected
 *  - Reactions (emoji)
 *  - Create new circle (with condition tag + privacy + AI moderation)
 *  - Skeleton/empty/error states, WCAG 2.1 AA
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageCircle, Plus, ArrowLeft, Send, Heart, Shield, Lock,
  AlertTriangle, X, Sparkles, ChevronRight, Hash, Search, Globe,
  Phone, Flag, Trash2, Smile, UserCircle2,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import {
  SupportCircle, CircleMessage, ModerationResult,
  getCircles, getCircleById, createCircle, joinCircle, leaveCircle,
  getMyCircles, getMessages, sendMessage, reactToMessage, deleteMessage,
  markCircleRead, getCrisisResource, CONDITION_TAGS,
} from '@/services/supportCircles';

type View = 'discover' | 'mine' | 'circle' | 'create';

const AVATAR_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

export default function SupportCircles() {
  const { t, user, country } = useCountry() as any;
  const [view, setView] = useState<View>('discover');
  const [circles, setCircles] = useState<SupportCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [conditionFilter, setConditionFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCircles = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCircles({
        countryCode: country?.code,
        userId: user.id,
      });
      setCircles(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [user?.id, country?.code]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  const filtered = useMemo(() => {
    let list = circles;
    if (view === 'mine') list = list.filter((c) => c.is_member);
    if (conditionFilter !== 'all') list = list.filter((c) => c.condition_tag === conditionFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return list;
  }, [circles, view, conditionFilter, searchQuery]);

  const openCircle = (id: string) => {
    setSelectedCircleId(id);
    setView('circle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('supportCircles.title') ?? 'Círculos de Apoio'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('supportCircles.subtitle') ?? 'Não estás sozinho'}</p>
            </div>
          </div>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Plus className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{t('supportCircles.create') ?? 'Criar'}</span>
          </button>
        </div>
        {/* Tabs */}
        {view !== 'circle' && view !== 'create' && (
          <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1">
            <Tab active={view === 'discover'} onClick={() => setView('discover')} label={t('supportCircles.discover') ?? 'Descobrir'} icon={<Search className="w-3.5 h-3.5" />} />
            <Tab active={view === 'mine'} onClick={() => setView('mine')} label={t('supportCircles.mine') ?? 'Meus'} icon={<Heart className="w-3.5 h-3.5" />} />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" aria-hidden />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {(view === 'discover' || view === 'mine') && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {/* Condition filter */}
              <div className="mb-4 flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label={t('supportCircles.filterCondition') ?? 'Filtrar por condição'}>
                <button
                  onClick={() => setConditionFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-full transition ${conditionFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  role="radio" aria-checked={conditionFilter === 'all'}
                >
                  {t('supportCircles.all') ?? 'Todas'}
                </button>
                {CONDITION_TAGS.map((c) => (
                  <button
                    key={c.tag}
                    onClick={() => setConditionFilter(c.tag)}
                    className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition ${conditionFilter === c.tag ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    style={conditionFilter === c.tag ? { background: c.color } : {}}
                    role="radio" aria-checked={conditionFilter === c.tag}
                  >
                    <span>{c.emoji}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('supportCircles.searchPlaceholder') ?? 'Procurar círculos...'}
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                />
              </div>

              {/* List */}
              {loading ? (
                <div className="space-y-3" role="status" aria-busy="true" aria-live="polite">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyList view={view} onCreate={() => setView('create')} t={t} />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((c, idx) => (
                    <CircleCard key={c.id} circle={c} index={idx} onOpen={() => openCircle(c.id!)} t={t} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {view === 'circle' && selectedCircleId && (
            <motion.div key="circle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CircleDetail circleId={selectedCircleId} onBack={() => setView('discover')} t={t} userId={user?.id} countryCode={country?.code ?? 'MZ'} />
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CreateCircleForm
                userId={user?.id ?? ''}
                countryCode={country?.code ?? 'MZ'}
                language={country?.default_locale?.split('-')[0] ?? 'pt'}
                onCreated={(id) => { loadCircles(); openCircle(id); }}
                onCancel={() => setView('discover')}
                t={t}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Tab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {icon}{label}
    </button>
  );
}

/* ---------- Circle card ---------- */

function CircleCard({ circle, index, onOpen, t }: { circle: SupportCircle; index: number; onOpen: () => void; t: any }) {
  const cfg = CONDITION_TAGS.find((c) => c.tag === circle.condition_tag) ?? { emoji: '💬', color: '#64748B', label: circle.condition_tag };

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
    >
      <button
        onClick={onOpen}
        className="w-full text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${cfg.color}20` }}
            aria-hidden
          >
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 truncate">{circle.name}</h3>
              {circle.is_private && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  <Lock className="w-2.5 h-2.5" /> {t('supportCircles.private') ?? 'Privado'}
                </span>
              )}
              {circle.is_member && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t('supportCircles.joined') ?? 'Membro'}
                </span>
              )}
            </div>
            {circle.description && <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{circle.description}</p>}
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {circle.members_count ?? 0}
              </span>
              {circle.last_message_preview && (
                <span className="truncate max-w-[200px]">
                  <MessageCircle className="w-3 h-3 inline mr-1" />
                  {circle.last_message_preview}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </div>
      </button>
    </motion.li>
  );
}

/* ---------- Circle detail ---------- */

function CircleDetail({ circleId, onBack, t, userId, countryCode }: { circleId: string; onBack: () => void; t: any; userId?: string; countryCode: string }) {
  const [circle, setCircle] = useState<SupportCircle | null>(null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [moderation, setModeration] = useState<ModerationResult | null>(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, msgs] = await Promise.all([
        getCircleById(circleId, userId),
        getMessages(circleId, 50),
      ]);
      setCircle(c);
      setMessages(msgs.reverse());
      if (userId) await markCircleRead(circleId, userId);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [circleId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !circle) return;
    setSending(true);
    setModeration(null);
    try {
      const { message, moderation } = await sendMessage(circleId, userId, input.trim(), {
        isAnonymous: anonymous,
        replyTo: replyTo ?? undefined,
        language: circle.language ?? 'pt',
      });
      if (message) {
        setMessages((prev) => [...prev, message]);
        setInput('');
        setReplyTo(null);
      }
      setModeration(moderation);
      if (moderation.categories.includes('crisis') || moderation.categories.includes('self_harm')) {
        setShowCrisis(true);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) return;
    try {
      await joinCircle(circleId, userId);
      await load();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    await reactToMessage(messageId, emoji);
    setMessages((prev) => prev.map((m) => m.id === messageId ? {
      ...m,
      reactions: { ...(m.reactions ?? {}), [emoji]: ((m.reactions ?? {})[emoji] ?? 0) + 1 },
    } : m));
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <div className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('supportCircles.notFound') ?? 'Círculo não encontrado'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">Voltar</button>
      </div>
    );
  }

  const cfg = CONDITION_TAGS.find((c) => c.tag === circle.condition_tag) ?? { emoji: '💬', color: '#64748B', label: circle.condition_tag };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Voltar">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${cfg.color}20` }}
        >
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900 truncate">{circle.name}</h2>
          <p className="text-xs text-slate-500 inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {circle.members_count ?? 0} {t('supportCircles.members') ?? 'membros'}
            {circle.ai_moderation_enabled && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-600">
                <Shield className="w-3 h-3" /> {t('supportCircles.moderated') ?? 'Moderado IA'}
              </span>
            )}
          </p>
        </div>
        {!circle.is_member && (
          <button
            onClick={handleJoin}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
          >
            {t('supportCircles.join') ?? 'Entrar'}
          </button>
        )}
      </div>

      {/* Moderation banner */}
      {moderation && moderation.status === 'flagged' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2"
        >
          <Flag className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
          <div className="flex-1">
            <div className="font-medium">{t('supportCircles.flagged') ?? 'Mensagem sinalizada'}</div>
            <div className="text-xs mt-0.5">{moderation.reason}</div>
          </div>
          <button onClick={() => setModeration(null)} aria-label="Fechar"><X className="w-4 h-4" /></button>
        </motion.div>
      )}

      {/* Crisis modal */}
      <AnimatePresence>
        {showCrisis && (
          <CrisisModal countryCode={countryCode} onClose={() => setShowCrisis(false)} t={t} />
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            {t('supportCircles.noMessages') ?? 'Sem mensagens. Sê o primeiro a partilhar.'}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.user_id === userId}
              index={idx}
              onReact={handleReact}
              onReply={() => setReplyTo(msg.id!)}
              t={t}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="mt-2 p-2 rounded-lg bg-slate-100 flex items-center gap-2 text-xs">
          <span className="text-slate-500">↳ {t('supportCircles.replying') ?? 'A responder'}</span>
          <span className="flex-1 truncate text-slate-700">
            {messages.find((m) => m.id === replyTo)?.content.slice(0, 60)}
          </span>
          <button onClick={() => setReplyTo(null)} aria-label="Cancelar resposta"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Input */}
      {circle.is_member ? (
        <div className="mt-3 flex items-end gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-slate-600 cursor-pointer p-2 rounded-lg hover:bg-slate-100">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <UserCircle2 className="w-3.5 h-3.5" />
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('supportCircles.writeMessage') ?? 'Escreve uma mensagem...'}
            rows={1}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 resize-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label={t('supportCircles.send') ?? 'Enviar'}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3 p-4 rounded-xl bg-slate-50 text-center text-sm text-slate-600">
          {t('supportCircles.joinToSend') ?? 'Entra no círculo para enviar mensagens'}
          <button onClick={handleJoin} className="ml-2 text-emerald-600 font-medium hover:underline">
            {t('supportCircles.join') ?? 'Entrar'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Message bubble ---------- */

function MessageBubble({ msg, isOwn, index, onReact, onReply, t }: {
  msg: CircleMessage; isOwn: boolean; index: number;
  onReact: (id: string, emoji: string) => void; onReply: () => void; t: any;
}) {
  const reactions = msg.reactions ?? {};
  const reactionEmojis = ['❤️', '🙏', '💪', '✨'];
  const [showReactions, setShowReactions] = useState(false);

  const colorIndex = (msg.user_id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
        style={{ background: color }}
        aria-hidden
      >
        {msg.author_name?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : ''} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs text-slate-500 mb-0.5 ml-1">
            {msg.author_name}
            {msg.is_anonymous && <span className="ml-1 opacity-60">({t('supportCircles.anon') ?? 'anónimo'})</span>}
          </span>
        )}
        <div
          className={`relative px-3 py-2 rounded-2xl text-sm ${
            isOwn ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm'
          }`}
        >
          {msg.content}
          {msg.ai_moderation_status === 'flagged' && (
            <div className={`mt-1 pt-1 border-t ${isOwn ? 'border-white/20' : 'border-slate-200'} flex items-center gap-1 text-xs`}>
              <Flag className="w-3 h-3" />
              <span>{t('supportCircles.flaggedShort') ?? 'Sinalizado'}</span>
            </div>
          )}
          <button
            onClick={() => setShowReactions((v) => !v)}
            className={`absolute -bottom-2 ${isOwn ? '-left-2' : '-right-2'} w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition`}
            aria-label="Reagir"
          >
            <Smile className="w-3 h-3 text-slate-500" />
          </button>
          {showReactions && (
            <div className={`absolute -top-9 ${isOwn ? 'right-0' : 'left-0'} bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-10`}>
              {reactionEmojis.map((e) => (
                <button
                  key={e}
                  onClick={() => { onReact(msg.id!, e); setShowReactions(false); }}
                  className="hover:scale-125 transition text-sm"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-0.5 text-xs ${isOwn ? 'justify-end' : ''} text-slate-400`}>
          <span>{new Date(msg.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={onReply} className="hover:text-slate-600">{t('supportCircles.reply') ?? 'Responder'}</button>
          {Object.entries(reactions).length > 0 && (
            <div className="flex gap-0.5">
              {Object.entries(reactions).slice(0, 3).map(([emoji, count]) => (
                <span key={emoji} className="px-1.5 py-0.5 rounded-full bg-slate-100 text-xs">
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Crisis modal ---------- */

function CrisisModal({ countryCode, onClose, t }: { countryCode: string; onClose: () => void; t: any }) {
  const resource = getCrisisResource(countryCode);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="crisis-title"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7 text-red-500" />
        </div>
        <h2 id="crisis-title" className="text-xl font-bold text-center text-slate-900">
          {t('supportCircles.crisisTitle') ?? 'Importas-te. Estamos aqui.'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 text-center">
          {t('supportCircles.crisisBody') ?? 'O que escreveste sugere que podes estar a passar por um momento difícil. Por favor, fala com alguém agora.'}
        </p>
        <div className="mt-4 space-y-2">
          {resource.hotlines.map((h, i) => (
            <a
              key={i}
              href={`tel:${h.number.replace(/\s/g, '')}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition"
            >
              <Phone className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{h.name}</div>
                <div className="text-xs text-slate-500">{resource.country}</div>
              </div>
              <span className="text-lg font-bold text-red-600">{h.number}</span>
            </a>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
        >
          {t('common.close') ?? 'Fechar'}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Create form ---------- */

function CreateCircleForm({ userId, countryCode, language, onCreated, onCancel, t }: {
  userId: string; countryCode: string; language: string;
  onCreated: (id: string) => void; onCancel: () => void; t: any;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditionTag, setConditionTag] = useState('mental_health');
  const [isPrivate, setIsPrivate] = useState(false);
  const [aiModeration, setAiModeration] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const c = await createCircle(userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        condition_tag: conditionTag,
        country_code: countryCode,
        language,
        is_private: isPrivate,
        require_approval: isPrivate,
        ai_moderation_enabled: aiModeration,
      });
      onCreated(c.id!);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{t('supportCircles.createTitle') ?? 'Criar círculo'}</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('supportCircles.name') ?? 'Nome'} <span className="text-red-500">*</span></span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder="Diabéticos de Maputo"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('supportCircles.description') ?? 'Descrição'}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="Para quem vive com diabetes, partilhar dicas e suporte"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700 block mb-1">{t('supportCircles.condition') ?? 'Condição'}</span>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {CONDITION_TAGS.map((c) => (
            <button
              type="button"
              key={c.tag}
              onClick={() => setConditionTag(c.tag)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${
                conditionTag === c.tag ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[10px] text-center text-slate-700">{c.label}</span>
            </button>
          ))}
        </div>
      </label>

      <div className="flex gap-4">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          {t('supportCircles.private') ?? 'Privado'}
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={aiModeration} onChange={(e) => setAiModeration(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          {t('supportCircles.aiModeration') ?? 'Moderação IA'}
        </label>
      </div>

      <div className="flex justify-between pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          {t('common.cancel') ?? 'Cancelar'}
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? '…' : t('supportCircles.create') ?? 'Criar'}
        </button>
      </div>
    </form>
  );
}

/* ---------- Empty ---------- */

function EmptyList({ view, onCreate, t }: { view: View; onCreate: () => void; t: any }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <Users className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {view === 'mine'
          ? (t('supportCircles.emptyMineTitle') ?? 'Ainda sem círculos')
          : (t('supportCircles.emptyDiscoverTitle') ?? 'Nenhum círculo encontrado')}
      </h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        {view === 'mine'
          ? (t('supportCircles.emptyMineBody') ?? 'Entra num círculo ou cria o teu próprio para começares a partilhar com pessoas que entendem o que vives.')
          : (t('supportCircles.emptyDiscoverBody') ?? 'Sê o primeiro a criar um círculo para esta condição na tua região.')}
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700"
      >
        <Plus className="w-4 h-4" /> {t('supportCircles.createFirst') ?? 'Criar primeiro círculo'}
      </button>
    </div>
  );
}
