// ============================================================
// Meddy Copilot · Supabase Edge Function
// supabase/functions/meddy-copilot/index.ts
// ============================================================
// Recebe: { query, context, user_scope }
// Devolve: { response: string }
// Usa ZAI chat completions API para gerar respostas analíticas
// com base no snapshot de dados de compliance enviado pelo cliente.
// ============================================================

const ZAI_API_KEY = Deno.env.get("ZAI_API_KEY") || "";
const ZAI_API_URL = Deno.env.get("ZAI_API_URL") || "https://api.z.ai/api/paas/v4";

const SYSTEM_PROMPT = `És o Meddy Copilot, assistente IA especializado em compliance global de saúde para a plataforma MedWallet.

O teu papel:
- Analisar dados de compliance regulatória (frameworks ANVISA, NAFDAC, BPOM, SFDA, GDPR, etc.)
- Identificar riscos (documentos expirando, parceiros suspensos, frameworks não-complientes)
- Recomendar ações concretas para gestores regionais
- Comparar desempenho entre países e regiões (PALOP, África Subsaariana, LATAM, SEA, MENA, Europa)
- Resumir eventos de auditoria e sinistros de micro-seguros

Formato da resposta:
- Conciso, em português europeu (PT-PT)
- Usa Markdown para negrito, listas e tabelas quando útil
- Inclui sempre números concretos do contexto fornecido
- Quando recomendas ação, estrutura como: "Ação recomendada: ..."
- Se os dados não chegam para responder, diz claramente o que falta

Restrições:
- NUNCA inventes dados que não estejam no contexto fornecido
- Não dês conselhos médicos, apenas de gestão/compliance
- Mantém tom profissional mas acessível`;

interface RequestBody {
  query: string;
  context: {
    scope: string;
    countries: any[];
    frameworks: any[];
    partners: any[];
    audit_recent: any[];
    insurance_products: any[];
    insurance_claims: any[];
  };
  user_scope?: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { query, context } = body;

    if (!query) {
      return jsonResponse({ error: "Missing query" }, 400);
    }

    // Compact context for prompt
    const contextSummary = {
      scope: context.scope,
      countries: context.countries.slice(0, 30),
      frameworks: context.frameworks.slice(0, 50),
      partners: context.partners.slice(0, 30),
      audit_recent: context.audit_recent.slice(0, 20),
      insurance_products: context.insurance_products.slice(0, 20),
      insurance_claims: context.insurance_claims.slice(0, 20),
      totals: {
        countries: context.countries.length,
        frameworks: context.frameworks.length,
        partners: context.partners.length,
        audit_events: context.audit_recent.length,
        insurance_products: context.insurance_products.length,
        insurance_claims: context.insurance_claims.length,
      },
    };

    let responseText: string;

    if (ZAI_API_KEY) {
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Contexto de dados (JSON):\n\`\`\`json\n${JSON.stringify(contextSummary, null, 2)}\n\`\`\`\n\nPergunta do gestor: ${query}`,
        },
      ];

      const zaiResp = await fetch(`${ZAI_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "glm-4.6",
          messages,
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!zaiResp.ok) {
        throw new Error(`ZAI API error: ${zaiResp.status}`);
      }

      const zaiData = await zaiResp.json();
      responseText = zaiData.choices?.[0]?.message?.content || "Sem resposta do modelo.";
    } else {
      // Fallback: template-based response when no API key
      responseText = generateLocalResponse(query, contextSummary);
    }

    return jsonResponse({ response: responseText });
  } catch (e) {
    console.error("meddy-copilot error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function generateLocalResponse(query: string, ctx: any): string {
  const q = query.toLowerCase();
  const totals = ctx.totals;

  if (q.includes("pior") || q.includes("worst")) {
    const sorted = [...ctx.countries].sort((a, b) => a.score - b.score);
    const worst = sorted[0];
    if (worst) {
      return `O país com pior score de compliance é **${worst.name}** (${worst.id}) com ${worst.score}/100.\n\nIndicadores:\n- ${worst.partners} parceiros certificados\n- ${worst.expired_docs} documentos expirados\n- ${worst.expiring_30d} a expirar em 30 dias\n\nAção recomendada: priorizar auditoria de documentos em ${worst.name}.`;
    }
  }

  if (q.includes("expir") && q.includes("30")) {
    const total = ctx.countries.reduce((s: number, c: any) => s + (c.expiring_30d || 0), 0);
    return `Total de **${total} documentos** expiram nos próximos 30 dias.`;
  }

  if (q.includes("framework") || q.includes("não-compl")) {
    const nonCompliant = ctx.frameworks.filter((f: any) => f.score < 50);
    return `**${nonCompliant.length} frameworks não-complientes** (score < 50%) de um total de ${totals.frameworks}.`;
  }

  if (q.includes("sinistro") || q.includes("claim") || q.includes("pago")) {
    const paid = ctx.insurance_claims.filter((c: any) => ["paid", "auto_approved", "approved"].includes(c.status));
    const total = paid.reduce((s: number, c: any) => s + (c.amount_paid || c.requested), 0);
    return `**${paid.length} sinistros pagos** num total de **$${total.toFixed(2)}**.\n\n${totals.insurance_products} produtos ativos.`;
  }

  return `Recebi a tua pergunta: "${query}".\n\nTenho acesso a ${totals.countries} países, ${totals.frameworks} frameworks, ${totals.partners} parceiros e ${totals.audit_events} eventos de auditoria.\n\n*Nota: a correr em modo local sem ZAI_API_KEY configurada. Define a variável no Supabase para ativar respostas completas com IA.*`;
}
