/**
 * Testes unitários para src/lib/openrouter.ts
 * Verifica a lógica de fallback, parsing e validação
 * sem chamar a rede (mock de fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubEnv("VITE_OPENROUTER_API_KEY", "sk-or-v1-testkey1234567890abcdef");

const {
  openRouterChat,
  openRouterStructured,
  isOpenRouterConfigured,
  simulateOpenRouterResponse,
} = await import("./openrouter");

describe("isOpenRouterConfigured", () => {
  it("retorna true quando VITE_OPENROUTER_API_KEY está presente", () => {
    expect(isOpenRouterConfigured()).toBe(true);
  });
});

describe("simulateOpenRouterResponse", () => {
  it("detecta malária", () => {
    const r = simulateOpenRouterResponse("Suspeita de malária");
    expect(r.toLowerCase()).toContain("act");
  });

  it("detecta TB", () => {
    const r = simulateOpenRouterResponse("Paciente com TB");
    expect(r.toLowerCase()).toContain("rifampicina");
  });

  it("detecta ARV", () => {
    const r = simulateOpenRouterResponse("Dúvida sobre ARV");
    expect(r.toLowerCase()).toContain("arv");
  });

  it("detecta gravidez", () => {
    const r = simulateOpenRouterResponse("Consulta de pré-natal");
    expect(r.toLowerCase()).toContain("pré-natal");
  });

  it("retorna resposta genérica para outros tópicos", () => {
    const r = simulateOpenRouterResponse("Dúvida genérica");
    expect(r.toLowerCase()).toContain("caso clínico");
  });
});

describe("openRouterChat — fallback em erro", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_OPENROUTER_API_KEY", "sk-or-v1-testkey1234567890abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lança erro quando a API responde 403 (região bloqueada)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Forbidden" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(openRouterChat("ola")).rejects.toThrow();
  });

  it("lança erro quando a API responde 429 (quota)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "quota exceeded" } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(openRouterChat("ola")).rejects.toThrow();
  });

  it("retorna texto da resposta em sucesso", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: "Olá, sou o assistente OpenRouter." } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const reply = await openRouterChat("ola");
    expect(reply).toBe("Olá, sou o assistente OpenRouter.");
  });

  it("envia Authorization header + HTTP-Referer + X-Title", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await openRouterChat("ola");

    const callArgs = fetchMock.mock.calls[0];
    const headers = callArgs?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      "Bearer sk-or-v1-testkey1234567890abcdef",
    );
    expect(headers["X-Title"]).toBe("MedWallet MZ");
    expect(headers["HTTP-Referer"]).toBeDefined();
  });
});

describe("openRouterStructured — fallback graceful", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_OPENROUTER_API_KEY", "sk-or-v1-testkey1234567890abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("retorna fallback quando a API falha", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Forbidden" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await openRouterStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback: { risk: "low" } },
    );
    expect(result).toEqual({ risk: "low" });
  });

  it("faz parse do JSON quando a API responde corretamente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: '{"risk":"high"}' } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await openRouterStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback: { risk: "low" } },
    );
    expect(result).toEqual({ risk: "high" });
  });
});
