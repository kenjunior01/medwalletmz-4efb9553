/**
 * GeminiAssistantCard — Cartão reutilizável de IA clínica (Gemini)
 * ----------------------------------------------------------------
 * Renderiza um assistente conversacional específico por vertical.
 * Cada página vertical passa um `systemPromptKey` e o componente
 * cuida do resto (input, histórico, fallback, erro amigável).
 *
 * Uso:
 *   <GeminiAssistantCard systemPromptKey="ape" title="Assistente APE" />
 */
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, Send, Bot, User, AlertCircle,
} from "lucide-react";
import {
  geminiChat, isGeminiConfigured, simulateGeminiResponse,
  GEMINI_SYSTEM_PROMPTS, type GeminiMessage,
} from "@/lib/gemini";
import { groqChat, isGroqConfigured } from "@/lib/groq";

type SystemPromptKey = keyof typeof GEMINI_SYSTEM_PROMPTS;

export interface GeminiAssistantCardProps {
  systemPromptKey: SystemPromptKey;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  /** Exibe um aviso de quota/região quando a API falha. */
  showQuotaNotice?: boolean;
}

interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const DEFAULT_LABELS: Record<SystemPromptKey, { title: string; placeholder: string }> = {
  ape: {
    title: "Assistente APE",
    placeholder: "Ex: paciente 3 anos, febre 39°C há 2 dias, sem outros sintomas. Próximo passo?",
  },
  tb: {
    title: "Assistente TB-DOT",
    placeholder: "Ex: paciente na 8ª semana de RHZE com náuseas e vómitos. Como gerir?",
  },
  art: {
    title: "Conselheiro ARV",
    placeholder: "Ex: paciente esqueceu 2 doses de TDF/3TC/DTG esta semana. O que fazer?",
  },
  malaria: {
    title: "Assistente Malária",
    placeholder: "Ex: TDR positivo em grávida 2º trimestre. Conduta?",
  },
  maternal: {
    title: "Assistente Materno-Infantil",
    placeholder: "Ex: gestante 32 sem com cefaleia intensa e visão turva. Conduta?",
  },
};

export function GeminiAssistantCard({
  systemPromptKey,
  title,
  subtitle,
  placeholder,
  showQuotaNotice = true,
}: GeminiAssistantCardProps) {
  const configured = isGeminiConfigured() || isGroqConfigured();
  const labels = DEFAULT_LABELS[systemPromptKey];
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"gemini" | "groq" | "local" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, loading]);

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userTurn: ChatTurn = { role: "user", text: prompt };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    setLoading(true);
    setError(null);
    setUsedFallback(false);

    const history: GeminiMessage[] = [...turns].map((t) => ({
      role: t.role,
      text: t.text,
    }));

    try {
      let reply: string | null = null;
      let provider: "gemini" | "groq" | "local" | null = null;

      // CAMADA 1: Gemini (Google AI Studio)
      try {
        reply = await geminiChat(prompt, {
          systemPrompt: GEMINI_SYSTEM_PROMPTS[systemPromptKey],
          history,
          temperature: 0.4,
          maxOutputTokens: 600,
        });
        provider = "gemini";
      } catch (geminiErr) {
        console.warn("Gemini falhou, tentando Groq:", geminiErr);
      }

      // CAMADA 2: Groq (ultra-rápido, fallback de região/quota)
      if (!reply && isGroqConfigured()) {
        try {
          reply = await groqChat(prompt, {
            systemPrompt: GEMINI_SYSTEM_PROMPTS[systemPromptKey],
            history: history.map((m) => ({
              role: m.role === "model" ? "assistant" : "user",
              content: m.text,
            })),
            temperature: 0.4,
            maxOutputTokens: 600,
          });
          provider = "groq";
        } catch (groqErr) {
          console.warn("Groq falhou:", groqErr);
        }
      }

      // CAMADA 3: Fallback local (sempre funciona)
      if (!reply) {
        reply = simulateGeminiResponse(prompt);
        provider = "local";
        setUsedFallback(true);
      } else {
        setUsedFallback(false);
      }

      setActiveProvider(provider);
      setTurns((prev) => [...prev, { role: "model", text: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fallback final: simulação local
      const fallback = simulateGeminiResponse(prompt);
      setTurns((prev) => [...prev, { role: "model", text: fallback }]);
      setUsedFallback(true);
      setActiveProvider("local");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Card className="bg-slate-900/60 border-slate-700">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-fuchsia-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {title ?? labels.title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <Badge
            className={
              configured
                ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30"
                : "bg-slate-700 text-slate-300 border-slate-600"
            }
          >
            {activeProvider === "gemini"
              ? "Gemini 2.0 Flash"
              : activeProvider === "groq"
                ? "Groq Llama 3.3"
                : activeProvider === "local"
                  ? "Modo Offline"
                  : configured
                    ? "Multi-IA"
                    : "Modo Offline"}
          </Badge>
        </div>

        {/* Conversation log */}
        {turns.length > 0 && (
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto space-y-2 bg-slate-950/40 rounded p-2 border border-slate-800"
          >
            {turns.map((turn, i) => (
              <div
                key={i}
                className={`flex gap-2 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {turn.role === "model" && (
                  <Bot className="h-4 w-4 text-fuchsia-400 flex-shrink-0 mt-0.5" />
                )}
                <div
                  className={`max-w-[80%] text-xs leading-relaxed rounded px-2 py-1.5 ${
                    turn.role === "user"
                      ? "bg-sky-500/20 text-sky-100"
                      : "bg-slate-800/70 text-slate-100"
                  }`}
                >
                  {turn.text}
                </div>
                {turn.role === "user" && (
                  <User className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-400">
                <Bot className="h-4 w-4 text-fuchsia-400" />
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Gemini a pensar...</span>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? labels.placeholder}
          rows={2}
          disabled={loading}
          className="bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm resize-none"
        />

        {/* Send + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {usedFallback && showQuotaNotice && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Quota/Região — resposta simulada localmente
              </span>
            )}
            {!usedFallback && (
              <span>Ctrl/Cmd + Enter para enviar</span>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="sm"
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </>
            )}
          </Button>
        </div>

        {/* Hidden error detail for debugging */}
        {error && usedFallback && (
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer hover:text-slate-400">
              Detalhes do erro
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-all">{error}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
