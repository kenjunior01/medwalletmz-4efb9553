/**
 * GeminiImageAnalyzer — Cartão reutilizável de visão Gemini
 * -----------------------------------------------------------
 * Permite ao técnico enviar uma foto (RDT, rótulo de ARV, ferida,
 * radiografia, etc.) e receber uma interpretação clínica.
 *
 * Usa o modelo gemini-2.0-flash multimodal com fallback simulado.
 */
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine, Loader2, Sparkles, AlertCircle, Upload, ImageIcon,
} from "lucide-react";
import {
  geminiAnalyzeImage, isGeminiConfigured,
} from "@/lib/gemini";

export interface GeminiImageAnalyzerProps {
  /** Prompt enviado junto da imagem — descreve o que o modelo deve procurar. */
  prompt: string;
  title?: string;
  badge?: string;
  /** Função de fallback quando a API falha. Recebe o nome do ficheiro. */
  fallback?: (fileName: string) => string;
}

export function GeminiImageAnalyzer({
  prompt,
  title = "Análise Visual por IA",
  badge = "Gemini Vision",
  fallback,
}: GeminiImageAnalyzerProps) {
  const configured = isGeminiConfigured();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setUsedFallback(false);
    setLoading(true);

    try {
      const reply = await geminiAnalyzeImage(file, prompt, {
        temperature: 0.2,
        maxOutputTokens: 400,
      });
      setResult(reply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setUsedFallback(true);
      setResult(
        fallback
          ? fallback(file.name)
          : `[Simulado] Não foi possível contactar a Gemini API. Verifica quota/região e tenta novamente. Ficheiro: ${file.name}`,
      );
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <Card className="bg-slate-900/60 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          </div>
          <Badge
            className={
              configured
                ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30"
                : "bg-slate-700 text-slate-300 border-slate-600"
            }
          >
            {configured ? badge : "Offline"}
          </Badge>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="hidden"
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full bg-slate-950/40 border-slate-700 text-slate-100 hover:bg-slate-800"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {fileName ? `Analisar: ${fileName}` : "Enviar imagem"}
        </Button>

        {preview && (
          <div className="rounded border border-slate-700 overflow-hidden bg-slate-950">
            <img
              src={preview}
              alt={fileName ?? "preview"}
              className="w-full max-h-48 object-contain"
            />
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="h-3 w-3 text-fuchsia-400" />
              <span>Interpretação Gemini</span>
              {usedFallback && (
                <span className="flex items-center gap-1 text-amber-400 ml-2">
                  <AlertCircle className="h-3 w-3" />
                  Simulado (quota/região)
                </span>
              )}
            </div>
            <div className="text-xs leading-relaxed text-slate-100 bg-slate-950/40 border border-slate-800 rounded p-3 whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        {error && usedFallback && (
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer hover:text-slate-400">
              Detalhes do erro
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-all">{error}</pre>
          </details>
        )}

        {!result && !loading && (
          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <ImageIcon className="h-3 w-3 mt-0.5" />
            <span>
              Suporta JPG/PNG/WebP. Exemplos: foto de TDR, rótulo de medicamento, ferida cutânea.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
