// src/pages/AiAssistant.tsx — MedWallet MZ (versão Lovable, auto-contida)
// Página do Assistente de Saúde + botão reutilizável «Explicar com IA».
// Rota no App.tsx:
//   import AiAssistant from "@/pages/AiAssistant";
//   <Route path="/assistente-ia" element={<AiAssistant />} />
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string; reasoning?: string };

async function callAI(action: string, body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Não estás autenticado. Entra de novo.");
  const url = `${supabase.supabaseUrl}/functions/v1/ai-assistant`;
  const resp = await fetch(url, {
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
  const [diagnostico, setDiagnostico] = useState("");
  const [emergency, setEmergency] = useState<{ instrucao: string; sinais: string[] } | null>(null);
  const [mostrarPensamento, setMostrarPensamento] = useState(false);

  const diagnosticar = async () => {
    setDiagnostico("A testar a chave NVIDIA...");
    try {
      const resp = await callAI("ping", {});
      const j = await resp.json();
      setDiagnostico(j.ok
        ? `OK: chave funciona. Modelo: ${j.modelo}. Resposta: ${j.resposta}`
        : `FALHOU (HTTP ${j.http_status ?? "?"}): ${j.detalhe ?? j.erro ?? "?"}`);
    } catch (e: any) { setDiagnostico("FALHOU: " + String(e.message ?? e)); }
  };

  const enviar = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput(""); setBusy(true); setError(""); setEmergency(null);
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    const upd = (fn: (m: Msg) => Msg) =>
      setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
    try {
      await streamChat(message, sessionId,
        (sid) => setSessionId(sid),
        (t) => upd((m) => ({ ...m, reasoning: (m.reasoning ?? "") + t })),
        (t) => upd((m) => ({ ...m, content: m.content + t })),
        (t) => setError(t),
        (instr, sinais) => setEmergency({ instrucao: instr, sinais }));
    } catch (e: any) { setError(String(e.message ?? e)); }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Assistente de Saúde — IA</h1>
      <Button variant="outline" size="sm" onClick={diagnosticar}>Diagnóstico da API</Button>
      {diagnostico && <p className="text-xs whitespace-pre-wrap rounded border p-2">{diagnostico}</p>}

      {emergency && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <p className="whitespace-pre-wrap">{emergency.instrucao}</p>
          {emergency.sinais.length > 0 && (
            <p className="mt-2 text-xs text-red-700">Sinais detetados: {emergency.sinais.join(" · ")}</p>
          )}
          <button className="mt-2 text-xs underline" onClick={() => setEmergency(null)}>Fechar</button>
        </div>
      )}

      <div className="space-y-3 min-h-[200px]">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Pergunta sobre medicamentos, sintomas ou prevenção (malária, VIH, cólera...).</p>}
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
        Informação educativa — não substitui avaliação médica. Em emergência, procure o serviço de saúde mais próximo.
      </p>
    </div>
  );
}
