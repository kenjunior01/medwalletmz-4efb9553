/**
 * Testes unitários para src/lib/groq.ts
 * Verifica a lógica de fallback, parsing e validação
 * sem chamar a rede (mock de fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubEnv("VITE_GROQ_API_KEY", "gsk_testkey1234567890abcdef");

const { groqChat, groqStructured, isGroqConfigured, simulateGroqResponse } =
  await import("./groq");

describe("isGroqConfigured", () => {
  it("retorna true quando VITE_GROQ_API_KEY começa com gsk_", () => {
    expect(isGroqConfigured()).toBe(true);
  });
});

describe("simulateGroqResponse", () => {
  it("detecta malária", () => {
    const r = simulateGroqResponse("Suspeita de malária");
    expect(r.toLowerCase()).toContain("act");
  });

  it("detecta TB", () => {
    const r = simulateGroqResponse("Paciente com TB");
    expect(r.toLowerCase()).toContain("rifampicina");
  });

  it("detecta ARV", () => {
    const r = simulateGroqResponse("Dúvida sobre ARV");
    expect(r.toLowerCase()).toContain("arv");
  });

  it("detecta gravidez", () => {
    const r = simulateGroqResponse("Consulta de pré-natal");
    expect(r.toLowerCase()).toContain("pré-natal");
  });

  it("retorna resposta genérica para outros tópicos", () => {
    const r = simulateGroqResponse("Dúvida genérica");
    expect(r.toLowerCase()).toContain("caso clínico");
  });
});

describe("groqChat — fallback em erro", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GROQ_API_KEY", "gsk_testkey1234567890abcdef");
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

    await expect(groqChat("ola")).rejects.toThrow();
  });

  it("lança erro quando a API responde 429 (quota)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "quota exceeded" } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(groqChat("ola")).rejects.toThrow();
  });

  it("retorna texto da resposta em sucesso", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: "Olá, sou o assistente Groq." } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const reply = await groqChat("ola");
    expect(reply).toBe("Olá, sou o assistente Groq.");
  });

  it("envia Authorization header com a chave", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await groqChat("ola");

    const callArgs = fetchMock.mock.calls[0];
    const headers = callArgs?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      "Bearer gsk_testkey1234567890abcdef",
    );
  });
});

describe("groqStructured — fallback graceful", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GROQ_API_KEY", "gsk_testkey1234567890abcdef");
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

    const result = await groqStructured<{ risk: "low" | "high" }>(
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

    const result = await groqStructured<{ risk: "low" | "high" }>(
      "Avalia risco",
      { fallback: { risk: "low" } },
    );
    expect(result).toEqual({ risk: "high" });
  });
});
