// src/pages/AiAssistant.tsx — MedWallet MZ (v2, F57)
// Página do Assistente de Saúde + botão reutilizável «Explicar com IA».
// v2 — camada DUPLA de urgência:
//   1. Client-side: antes de enviar, regras locais interrompem a conversa
//      (não chega a chamar a IA e funciona sem sessão iniciada)
//   2. Server-side: a Edge Function repete a verificação (fonte de verdade)
// Novidades: banner fixo de disclaimer, acções rápidas (receita, exames,
// consulta, prevenção, farmácias/serviços), validação de embeddings 4096,
// «Nova conversa», diagnóstico sem login, link para /auth quando sem sessão.
// Rota no App.tsx (já existente):
//   const AiAssistant = lazy(() => import("./pages/AiAssistant"));
//   <Route path="/assistente-ia" element={<AiAssistant />} />
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string; reasoning?: string };

// Erro dedicado: sessão necessária (mostra botão «Entrar» em vez de erro cru)
class SessaoNecessariaError extends Error {}

async function callAI(action: string, body: Record<string, unknown> = {}, permitirAnonimo = false) {
  const { data } = await supabase.auth.getSession();
  let token: string | undefined = data.session?.access_token;
  // ping não acede a dados de utilizador → pode usar a chave pública (anon)
  if (!token && permitirAnonimo && typeof supabase.supabaseKey === "string") {
    token = supabase.supabaseKey;
  }
  if (!token) throw new SessaoNecessariaError();
  const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-assistant`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Erro ${resp.status}: ${t.slice(0, 300)}`);
  }
  return resp;
}

async function streamChat(
  message: string,
  sessionId: string | null,
  onMeta: (sid: string) => void,
  onReasoning: (t: string) => void,
  onContent: (t: string) => void,
  onError: (t: string) => void,
  onEmergency: (instrucao: string, sinais: string[]) => void,
) {
  const resp = await callAI("chat", { message, sessionId });
  if (!resp.body) { onError("Sem corpo de resposta"); return; }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "meta" && ev.sessionId) onMeta(ev.sessionId);
        else if (ev.type === "reasoning") onReasoning(ev.text);
        else if (ev.type === "content") onContent(ev.text);
        else if (ev.type === "error") onError(ev.text);
        else if (ev.type === "emergency") onEmergency(String(ev.instrucao ?? ""), Array.isArray(ev.sinais) ? ev.sinais.map(String) : []);
      } catch { /* ignora linhas parciais */ }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// CAMADA 1 — detecção de urgência NO CLIENTE (fora da IA).
// Espelho exacto das regras da Edge Function (que é a fonte de verdade).
// Interrompe a conversa antes de chamar a IA — e funciona sem sessão.
// ────────────────────────────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const REGRAS_URGENCIA_CLIENTE: { sinal: string; re: RegExp }[] = [
  { sinal: "dificuldade em respirar", re: /(dificuldade (de|em) respirar|nao consigo respirar|falta de ar|a sufocar|sufocando)/ },
  { sinal: "dor no peito", re: /(dor no peito|dor forte no peito|dor intensa no peito|aperto no peito)/ },
  { sinal: "inconsciência / desmaio", re: /(inconsciente|desmaiou|desmaiada|desmaiado|nao acorda|perdeu os sentidos)/ },
  { sinal: "convulsões", re: /(convuls|a ter ataques|ataque convulsivo|ataque epileptico|crise epileptica)/ },
  { sinal: "hemorragia", re: /(hemorragia|a sangrar muito|sangramento forte|sangramento intenso|perdeu muito sangue|nao para de sangrar)/ },
  { sinal: "sinais de AVC", re: /(avc|derrame|cara torta|boca torta|fala enrolada|fala embolada|braco dormente|forca de um lado so|perdi a fala|visao dupla)/ },
  { sinal: "gravidez com sangramento ou dor intensa", re: /(gravida|gravidez)[^.]{0,80}(sangue|sangrar|sangramento|dor forte|dor intensa)/ },
  { sinal: "bebé com febre", re: /\b(bebe|lactente|recem-nascido)\b[^.]{0,60}febre/ },
  { sinal: "criança com febre preocupante", re: /(crianca)[^.]{0,60}febre[^.]{0,60}(alta|convuls|nao baixa|tres dias|5 dias|cinco dias)/ },
  { sinal: "risco de suicídio", re: /(quero morrer|suicidio|me matar|tirar a minha propria vida)/ },
  { sinal: "vómito com sangue", re: /(vomit\w* (com )?sangue|hematemese)/ },
  { sinal: "sangue nas fezes", re: /(fezes com sangue|sangue nas fezes|sangue no cu)/ },
  { sinal: "engasgamento", re: /(engasgado|engasgada|engasgou|a engasgar|algo preso na garganta)/ },
  { sinal: "envenenamento / overdose", re: /(envenenamento|envenenou|engoli veneno|bebeu veneno|tomou veneno|overdose|tomou todos os comprimidos|tomou todos os remedios)/ },
  { sinal: "ferida grave", re: /(ferida profunda|ferimento grave|corte profundo|osso (a )?atravessar a pele)/ },
  { sinal: "incapaz de falar ou mover", re: /(nao consigo falar|nao consigo mover|perdi a fala|paralisad|paralisi)/ },
  { sinal: "olhos revirados / corpo mole", re: /(olhos revirados|corpo mole|crianca mole)/ },
  { sinal: "parto urgente", re: /(contraccoes muito fort|contracoes muito fort|vou ter (o )?bebe agora|bebe esta a nascer|rompeu (o )?saco|rompeu aguas)/ },
  { sinal: "auto-agressão", re: /(me cortar|quero cortar-me|vou cortar-me|quero machucar-me)/ },
];

function detectarUrgenciaLocal(texto: string): string[] {
  const t = norm(texto);
  return REGRAS_URGENCIA_CLIENTE.filter((r) => r.re.test(t)).map((r) => r.sinal);
}

const TEXTO_URGENCIA =
  "SINAL DE EMERGÊNCIA DETETADO\n\n" +
  "Com base no que escreveste, é preciso ajuda médica URGENTE.\n\n" +
  "• Vai AGORA ao centro de saúde ou hospital mais próximo.\n" +
  "• Se poderes, pede a alguém para te acompanhar.\n" +
  "• Em Moçambique liga 119 (emergência), se disponível na tua zona.\n" +
  "• Não esperes para ver se passa.\n\n" +
  "Os sintomas podem ter várias causas e só uma avaliação presencial pode identificar o problema. Esta ferramenta não substitui avaliação médica.";

// Acções rápidas — funcionalidades úteis pedidas para a triagem
const ACCOES_RAPIDAS = [
  { label: "Explicar receita", texto: "Ajuda-me a entender uma receita médica em linguagem simples. Está escrito assim: " },
  { label: "Preparação para exames", texto: "Vou fazer um exame e quero saber como me preparar (jejum, medicação, o que levar). O exame é: " },
  { label: "Perguntas para a consulta", texto: "Prepara uma lista de perguntas para levar à consulta médica. Os meus sintomas ou dúvidas são: " },
  { label: "Prevenção", texto: "Como posso prevenir problemas relacionados com: " },
  { label: "Farmácias e serviços", texto: "Que tipo de serviço de saúde devo procurar (farmácia, centro de saúde, hospital) para: " },
];

// Botão reutilizável «Explicar com IA» para páginas de medicamentos/exames
export function ExplicarComIABotao({ pergunta, label = "Explicar com IA" }: { pergunta: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [mostrarPensamento, setMostrarPensamento] = useState(false);

  const explicar = async () => {
    setOpen(true); setLoading(true); setContent(""); setReasoning(""); setError("");
    try {
      await streamChat(pergunta, null,
        () => {}, (t) => setReasoning((r) => r + t),
        (t) => setContent((c) => c + t), (t) => setError(t), () => {});
    } catch (e: any) { setError(String(e.message ?? e)); }
    setLoading(false);
  };

  return (
    <div className="my-2">
      <Button variant="secondary" size="sm" onClick={explicar}>{label}</Button>
      {open && (
        <div className="mt-2 rounded-lg border p-3 text-sm space-y-2">
          {error && <p className="text-red-600 text-xs whitespace-pre-wrap">Erro: {error}</p>}
          {reasoning && (
            <div>
              <button className="text-xs text-muted-foreground underline" onClick={() => setMostrarPensamento(!mostrarPensamento)}>
                {mostrarPensamento ? "Esconder pensamento" : "Mostrar pensamento da IA"}
              </button>
              {mostrarPensamento && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{reasoning}</p>}
            </div>
          )}
          <p className="whitespace-pre-wrap">{content || (loading ? "A pensar..." : "")}</p>
          {!loading && content && (
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
          )}
        </div>
      )}
    </div>
  );
}

// Página completa: /assistente-ia
export default function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [semSessao, setSemSessao] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");
  const [embedStatus, setEmbedStatus] = useState("");
  const [emergency, setEmergency] = useState<{ instrucao: string; sinais: string[]; local: boolean } | null>(null);
  const [mostrarPensamento, setMostrarPensamento] = useState(false);

  const diagnosticar = async () => {
    setDiagnostico("A testar a ligação à NVIDIA...");
    try {
      const resp = await callAI("ping", {}, true); // v2: funciona sem login
      const j = await resp.json();
      setDiagnostico(j.ok
        ? `OK: chave funciona. Modelo: ${j.modelo}. Resposta: ${j.resposta}`
        : `FALHOU (HTTP ${j.http_status ?? "?"}): ${j.detalhe ?? j.erro ?? "?"}`);
    } catch (e: any) {
      setDiagnostico(e instanceof SessaoNecessariaError
        ? "FALHOU: sem sessão e sem chave pública para o teste."
        : "FALHOU: " + String(e?.message ?? e));
    }
  };

  const validarEmbeddings = async () => {
    setEmbedStatus("A validar dimensões dos embeddings...");
    try {
      const resp = await callAI("embed", { texts: ["teste de validação"], inputType: "query" });
      const j = await resp.json();
      setEmbedStatus(j.dimensions === 4096
        ? `OK: dimensão ${j.dimensions} (compatível com o RPC match_ai_meds)`
        : `ATENÇÃO: dimensão ${j.dimensions} ≠ 4096 — ajustar o RPC match_ai_meds e recriar embeddings`);
    } catch (e: any) {
      setEmbedStatus(e instanceof SessaoNecessariaError
        ? "Este teste precisa de sessão iniciada (entra na app primeiro)."
        : "FALHOU: " + String(e?.message ?? e));
    }
  };

  const novaConversa = () => {
    setMessages([]); setSessionId(null); setError(""); setEmergency(null); setInput(""); setSemSessao(false);
  };

  const enviar = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput(""); setBusy(true); setError(""); setSemSessao(false); setEmergency(null);

    // CAMADA 1 (cliente): urgência interrompe ANTES de chamar a IA
    const sinaisLocais = detectarUrgenciaLocal(message);
    if (sinaisLocais.length) {
      setMessages((m) => [...m, { role: "user", content: message }]);
      setEmergency({ instrucao: TEXTO_URGENCIA, sinais: sinaisLocais, local: true });
      setBusy(false);
      return;
    }

    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    const upd = (fn: (m: Msg) => Msg) =>
      setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
    try {
      await streamChat(message, sessionId,
        (sid) => setSessionId(sid),
        (t) => upd((m) => ({ ...m, reasoning: (m.reasoning ?? "") + t })),
        (t) => upd((m) => ({ ...m, content: m.content + t })),
        (t) => setError(t),
        (instr, sinais) => setEmergency({ instrucao: instr, sinais, local: false }));
    } catch (e: any) {
      if (e instanceof SessaoNecessariaError) setSemSessao(true);
      else setError(String(e?.message ?? e));
    }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Assistente de Saúde — IA</h1>

      {/* Banner fixo de segurança (v2) */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-center text-[11px] text-amber-900">
        Triagem assistida — esta ferramenta NÃO dá diagnósticos e não substitui avaliação médica.
        Em emergência, ligue 119 ou vá ao centro de saúde mais próximo.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={diagnosticar}>Diagnóstico da API</Button>
        <Button variant="outline" size="sm" onClick={validarEmbeddings}>Validar embeddings (4096)</Button>
        <Button variant="ghost" size="sm" onClick={novaConversa}>Nova conversa</Button>
      </div>
      {diagnostico && <p className="text-xs whitespace-pre-wrap rounded border p-2">{diagnostico}</p>}
      {embedStatus && <p className="text-xs whitespace-pre-wrap rounded border p-2">{embedStatus}</p>}

      {/* Acções rápidas (v2) */}
      <div className="grid grid-cols-2 gap-2">
        {ACCOES_RAPIDAS.map((a) => (
          <Button
            key={a.label}
            variant="secondary"
            size="sm"
            className="h-auto justify-start whitespace-normal py-2 text-left"
            onClick={() => setInput(a.texto)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {emergency && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <p className="font-semibold">A conversa normal foi interrompida.</p>
          <p className="mt-2 whitespace-pre-wrap">{emergency.instrucao}</p>
          {emergency.sinais.length > 0 && (
            <p className="mt-2 text-xs text-red-700">
              Sinais detetados: {emergency.sinais.join(" · ")}
              {emergency.local ? " (verificação local, antes da IA)" : ""}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-red-700 text-white hover:bg-red-800"
              onClick={() => { window.location.href = "tel:119"; }}
            >
              Ligar 119 (emergência)
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmergency(null)}>Voltar à conversa</Button>
            <Button variant="ghost" size="sm" onClick={novaConversa}>Nova conversa</Button>
          </div>
        </div>
      )}

      <div className="space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pergunta sobre medicamentos, sintomas ou prevenção (malária, VIH, cólera...).
            Usa uma acção rápida acima ou escreve livremente — sinais de emergência são
            detectados automaticamente.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "assistant" && m.reasoning && (
                <div className="mb-2">
                  <button className="text-xs underline" onClick={() => setMostrarPensamento(!mostrarPensamento)}>
                    {mostrarPensamento ? "Esconder pensamento" : "Mostrar pensamento"}
                  </button>
                  {mostrarPensamento && <p className="mt-1 text-xs opacity-70 whitespace-pre-wrap">{m.reasoning}</p>}
                </div>
              )}
              {m.content || (busy && i === messages.length - 1 ? "A pensar..." : "")}
            </div>
          </div>
        ))}
      </div>

      {semSessao && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          O chat com IA usa sessões seguras ligadas à tua conta (dados médicos protegidos).
          <Link to="/auth" className="ml-1 font-medium underline">Entrar na app</Link>
        </div>
      )}
      {error && <p className="text-red-600 text-xs whitespace-pre-wrap">Erro: {error}</p>}

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder="Escreve a tua pergunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          disabled={busy}
        />
        <Button onClick={enviar} disabled={busy || !input.trim()}>Enviar</Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Informação educativa — não substitui avaliação médica. Em emergência, ligue 119 ou
        procure o serviço de saúde mais próximo.
      </p>
    </div>
  );
}
