// ============================================================
// Meddy Copilot · Chat IA para análise de compliance
// src/pages/admin/MeddyCopilot.tsx
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useComplianceOverview, useAuditTrail, useMicroInsuranceProducts,
  useMicroInsuranceClaims, useRegulatoryFrameworks, usePartnerCertifications,
} from '@/hooks/useCompliance';
import {
  Send, Sparkles, Bot, User, Loader2, Globe2, ShieldCheck,
  AlertTriangle, TrendingUp, FileText,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  { icon: '🌍', text: 'Qual país tem o pior score de compliance e porquê?' },
  { icon: '⚠️', text: 'Quantos documentos expiram nos próximos 30 dias?' },
  { icon: '💎', text: 'Lista os parceiros Platina e Gold por país' },
  { icon: '🛡️', text: 'Que frameworks regulatórios estão não-complientes?' },
  { icon: '💸', text: 'Qual o total pago em sinistros de micro-seguros?' },
  { icon: '🔍', text: 'Que eventos críticos ocorreram nas últimas 24h?' },
];

export default function MeddyCopilot() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pre-fetch data to inject as context
  const { data: overview = [] } = useComplianceOverview();
  const { data: audit = [] } = useAuditTrail(isAdmin ? undefined : currentCountry?.id, 50);
  const { data: products = [] } = useMicroInsuranceProducts(isAdmin ? undefined : currentCountry?.id);
  const { data: claims = [] } = useMicroInsuranceClaims(isAdmin ? undefined : currentCountry?.id, 30);
  const { data: frameworks = [] } = useRegulatoryFrameworks(isAdmin ? undefined : currentCountry?.id);
  const { data: partners = [] } = usePartnerCertifications(isAdmin ? undefined : currentCountry?.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build context snapshot
      const context = {
        scope: isAdmin ? 'global' : `regional (${currentCountry?.name})`,
        countries: overview.map((o) => ({
          id: o.country_id, name: o.country_name,
          score: o.avg_compliance_score,
          partners: o.total_partners_certified,
          verified: o.verified_partners,
          expired_docs: o.expired_documents,
          expiring_30d: o.expiring_30_days,
          audit_events: o.total_audit_events,
          platinum: o.platinum_partners, gold: o.gold_partners,
          silver: o.silver_partners, bronze: o.bronze_partners,
        })),
        frameworks: frameworks.map((f) => ({
          country: f.country_id, code: f.framework_code, name: f.framework_name,
          score: f.compliance_score, mandatory: f.mandatory,
        })),
        partners: partners.slice(0, 30).map((p) => ({
          name: p.partner_name, type: p.partner_type, tier: p.certification_tier,
          status: p.status, country: p.country_id, transactions: p.total_transactions,
          rating: p.avg_rating, sla: p.sla_compliance,
        })),
        audit_recent: audit.slice(0, 20).map((e) => ({
          type: e.event_type, country: e.country_id, time: e.created_at,
          actor: e.actor_name, partner: e.partner_name,
        })),
        insurance_products: products.map((p) => ({
          country: p.country_id, name: p.product_name, trigger: p.trigger_type,
          premium: p.premium_amount, currency: p.premium_currency, coverage: p.coverage_amount,
        })),
        insurance_claims: claims.slice(0, 20).map((c) => ({
          country: c.country_id, type: c.claim_type, status: c.status,
          requested: c.amount_requested, paid: c.amount_paid,
        })),
      };

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('meddy-copilot', {
        body: {
          query,
          context,
          user_scope: context.scope,
        },
      });

      if (error) throw error;

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data?.response || 'Não consegui processar a tua pergunta. Tenta reformular.',
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (e: any) {
      // Fallback: if Edge Function fails, generate a local analytical response
      const fallback = generateFallbackResponse(query, {
        overview, audit, frameworks, partners, products, claims,
      });
      setMessages((m) => [...m, {
        role: 'assistant',
        content: `⚠️ *Modo offline* — Edge Function indisponível (${e.message}). Resposta baseada em dados locais:\n\n${fallback}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-gradient-to-r from-violet-950/40 via-slate-950 to-fuchsia-950/40 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full" />
              <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black">Meddy IA Copilot</h1>
              <p className="text-xs text-slate-400">
                Assistente inteligente · Análise de compliance em linguagem natural
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-violet-950/50 text-violet-300 border-violet-800/40">
              <Globe2 className="h-3 w-3 mr-1" /> {isAdmin ? 'Vista global' : currentCountry?.name}
            </Badge>
            <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-1" /> Online
            </Badge>
          </div>
        </div>
      </header>

      {/* Context chips */}
      <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/30">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-500 uppercase font-bold">Contexto carregado:</span>
          <Badge variant="outline" className="bg-slate-800/40 border-slate-700 text-slate-300">
            <Globe2 className="h-3 w-3 mr-1" /> {overview.length} países
          </Badge>
          <Badge variant="outline" className="bg-slate-800/40 border-slate-700 text-slate-300">
            <FileText className="h-3 w-3 mr-1" /> {frameworks.length} frameworks
          </Badge>
          <Badge variant="outline" className="bg-slate-800/40 border-slate-700 text-slate-300">
            <ShieldCheck className="h-3 w-3 mr-1" /> {partners.length} parceiros
          </Badge>
          <Badge variant="outline" className="bg-slate-800/40 border-slate-700 text-slate-300">
            <AlertTriangle className="h-3 w-3 mr-1" /> {audit.length} eventos audit
          </Badge>
          <Badge variant="outline" className="bg-slate-800/40 border-slate-700 text-slate-300">
            💸 {claims.length} sinistros
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 mb-4 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Olá! Sou o Meddy Copilot 🤖</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Tenho acesso a {overview.length} países, {frameworks.length} frameworks regulatórios,
              {partners.length} parceiros certificados e {audit.length} eventos de auditoria.
              Pergunta-me qualquer coisa sobre compliance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q.text}
                  onClick={() => send(q.text)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 hover:border-violet-700/40 transition-all text-left"
                >
                  <span className="text-xl">{q.icon}</span>
                  <span className="text-xs text-slate-300">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} msg={m} />)
        )}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Meddy está a analisar os dados...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/60 bg-slate-950/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Pergunta sobre compliance, parceiros, documentos, sinistros..."
            className="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            disabled={loading}
          />
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-2">
          Meddy pode cometer erros. Verifica informações críticas com fontes oficiais.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-start gap-3 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
        isUser ? 'bg-slate-700' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600'
      }`}>
        {isUser ? <User className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
      </div>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
        isUser
          ? 'bg-violet-900/30 border border-violet-800/40 rounded-tr-none text-slate-100'
          : 'bg-slate-900/60 border border-slate-800 rounded-tl-none text-slate-100'
      }`}>
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {new Date(msg.timestamp).toLocaleTimeString('pt-PT')}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Fallback local response (when Edge Function is unavailable)
// ============================================================
function generateFallbackResponse(query: string, data: {
  overview: any[]; audit: any[]; frameworks: any[]; partners: any[]; products: any[]; claims: any[];
}): string {
  const q = query.toLowerCase();

  if (q.includes('pior') || q.includes('worst') || q.includes('menor score')) {
    const sorted = [...data.overview].sort((a, b) => a.avg_compliance_score - b.avg_compliance_score);
    const worst = sorted[0];
    if (!worst) return 'Sem dados disponíveis.';
    return `O país com pior score de compliance é **${worst.country_name}** (${worst.country_id}) com ${worst.avg_compliance_score}/100.\n\nIndicadores:\n- ${worst.total_partners_certified} parceiros certificados\n- ${worst.expired_documents} documentos expirados\n- ${worst.expiring_30_days} a expirar em 30 dias\n\nAção recomendada: priorizar auditoria de documentos em ${worst.country_name}.`;
  }

  if (q.includes('expir') && q.includes('30')) {
    const total = data.overview.reduce((s, o) => s + o.expiring_30_days, 0);
    const byCountry = data.overview.filter((o) => o.expiring_30_days > 0).map((o) => `${o.country_name}: ${o.expiring_30_days}`).join('\n- ');
    return `Total de **${total} documentos** expiram nos próximos 30 dias.\n\nPor país:\n- ${byCountry || 'Nenhum'}`;
  }

  if (q.includes('platina') || q.includes('platinum') || q.includes('gold') || q.includes('ouro')) {
    const byCountry = data.overview.map((o) => ({
      name: o.country_name,
      platinum: o.platinum_partners,
      gold: o.gold_partners,
    })).filter((o) => o.platinum > 0 || o.gold > 0);
    if (byCountry.length === 0) return 'Nenhum parceiro Platina ou Gold encontrado.';
    return `Parceiros premium por país:\n\n${byCountry.map((c) => `**${c.name}**: 💎 ${c.platinum} Platina · 🥇 ${c.gold} Gold`).join('\n')}`;
  }

  if (q.includes('framework') || q.includes('compli') || q.includes('não-compl')) {
    const nonCompliant = data.frameworks.filter((f) => f.compliance_score < 50);
    if (nonCompliant.length === 0) return 'Todos os frameworks estão complientes (score ≥ 50%).';
    return `**${nonCompliant.length} frameworks não-complientes** (score < 50%):\n\n${nonCompliant.map((f) => `• ${f.country_id} · ${f.framework_name} — ${f.compliance_score}%`).join('\n')}`;
  }

  if (q.includes('sinistro') || q.includes('pago') || q.includes('claim') || q.includes('insurance')) {
    const paid = data.claims.filter((c) => c.status === 'paid' || c.status === 'auto_approved' || c.status === 'approved');
    const total = paid.reduce((s, c) => s + Number(c.amount_paid || c.amount_requested), 0);
    return `**${paid.length} sinistros pagos** num total de **$${total.toFixed(2)}**.\n\nDistribuição por país: ${data.products.length} produtos ativos em ${new Set(data.products.map((p) => p.country_id)).size} países.`;
  }

  if (q.includes('crític') || q.includes('critical') || q.includes('24h') || q.includes('evento')) {
    const critical = data.audit.filter((e) =>
      ['certification_revoked', 'document_expired', 'breach_detected', 'tier_downgraded'].includes(e.event_type)
    );
    if (critical.length === 0) return 'Nenhum evento crítico registado recentemente.';
    return `**${critical.length} eventos críticos** registados:\n\n${critical.slice(0, 10).map((e) => `• ${new Date(e.created_at).toLocaleString('pt-PT')} · ${e.event_type} · ${e.country_id || '—'}`).join('\n')}`;
  }

  return `Recebi a tua pergunta: "${query}".\n\nTenho acesso a ${data.overview.length} países, ${data.frameworks.length} frameworks, ${data.partners.length} parceiros e ${data.audit.length} eventos de auditoria. Tenta uma das perguntas sugeridas para obteres uma análise detalhada.`;
}
