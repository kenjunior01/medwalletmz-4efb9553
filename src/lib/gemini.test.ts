/**
 * Testes unitários para src/lib/gemini.ts
 * Verifica que a lógica de fallback, parsing e validação funciona
 * sem chamar a rede (mock de fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock import.meta.env antes de importar o módulo
vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-1234567890abcdef");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { geminiChat, geminiStructured, isGeminiConfigured, simulateGeminiResponse, GEMINI_SYSTEM_PROMPTS } =
  await import("./gemini");

describe("isGeminiConfigured", () => {
  it("retorna true quando VITE_GEMINI_API_KEY está definida e tem tamanho suficiente", () => {
    expect(isGeminiConfigured()).toBe(true);
  });
});

describe("GEMINI_SYSTEM_PROMPTS", () => {
  it("contém prompts para todas as 5 verticais", () => {
    expect(Object.keys(GEMINI_SYSTEM_PROMPTS).sort()).toEqual(
      ["ape", "art", "malaria", "maternal", "tb"].sort(),
    );
  });

  it("cada prompt menciona Moçambique e REFER", () => {
    for (const [key, prompt] of Object.entries(GEMINI_SYSTEM_PROMPTS)) {
      expect(prompt.toLowerCase()).toContain("moçamb");
      expect(prompt.toUpperCase()).toContain("REFER");
      // sanity: prompt tem pelo menos 100 chars para ser útil
      expect(prompt.length).toBeGreaterThan(100);
      void key;
    }
  });
});

describe("simulateGeminiResponse", () => {
  it("detecta perguntas de malária", () => {
    const r = simulateGeminiResponse("Paciente com suspeita de malária, TDR positivo");
    expect(r.toLowerCase()).toContain("act");
  });

  it("detecta perguntas de TB", () => {
    const r = simulateGeminiResponse("Paciente em tratamento TB com náuseas");
    expect(r.toLowerCase()).toContain("rifampicina");
  });

  it("detecta perguntas de ARV", () => {
    const r = simulateGeminiResponse("Paciente em ARV com rash cutâneo");
    expect(r.toLowerCase()).toContain("rash");
  });

  it("detecta perguntas de pré-natal", () => {
    const r = simulateGeminiResponse("Dúvida sobre gravidez e pré-natal");
    expect(r.toLowerCase()).toContain("pré-natal");
  });

  it("retorna resposta genérica para outros tópicos", () => {
    const r = simulateGeminiResponse("Dúvida aleatória");
    expect(r.toLowerCase()).toContain("caso clínico");
  });
});

describe("geminiChat — fallback em erro de quota", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-1234567890abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lança erro quando a API responde RESOURCE_EXHAUSTED (quota)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      );

    await expect(geminiChat("ola")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("lança erro quando a API responde 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "server error" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(geminiChat("ola")).rejects.toThrow("Gemini API 500");
  });

  it("retorna texto da resposta em sucesso", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: "Olá, sou o assistente." }] } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const reply = await geminiChat("ola");
    expect(reply).toBe("Olá, sou o assistente.");
  });
});

describe("geminiStructured — fallback graceful", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-1234567890abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("retorna fallback quando a API falha", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "quota" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await geminiStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback: { risk: "low" } },
    );
    expect(result).toEqual({ risk: "low" });
  });

  it("faz parse do JSON quando a API responde corretamente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: '{"risk":"high"}' }] } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await geminiStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback: { risk: "low" } },
    );
    expect(result).toEqual({ risk: "high" });
  });

  it("retorna fallback quando a resposta não é JSON válido", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: "não é json" }] } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const fallback = { risk: "low" as const };
    const result = await geminiStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback },
    );
    expect(result).toEqual(fallback);
  });
});
