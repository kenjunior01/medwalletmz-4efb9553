/**
 * Testes unitários para src/lib/mzPlans.ts
 * Verifica que a fonte única dos 14 planos MZ está consistente:
 *   - 6 B2C + 8 B2B = 14 planos
 *   - Slugs únicos e estáveis (coincidem com migration SQL)
 *   - Preços > 0 e em MZN
 *   - features array não vazio
 *   - BILLING_DISCOUNT tem 3 ciclos com multipliers coerentes
 *   - computePrice e computeExpiry funcionam
 *   - fetchPlanBySlug fallback em memória funciona quando BD falha
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client — todos os testes usam fallback em memória
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: new Error("mock") }),
          }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error("mock") }),
  },
}));

import {
  MZ_B2C_PLANS,
  MZ_B2B_PLANS,
  MZ_ALL_PLANS,
  BILLING_DISCOUNT,
  getPlanBySlug,
  getB2CPlanByAudience,
  getB2BPlansByAudience,
  computePrice,
  computePeriodMonths,
  computeExpiry,
  formatMZN,
  fetchPlanBySlug,
  seedMzPlans,
} from "./mzPlans";

describe("MZ_ALL_PLANS — contagem e slugs", () => {
  it("tem exactamente 14 planos (6 B2C + 8 B2B)", () => {
    expect(MZ_B2C_PLANS).toHaveLength(6);
    expect(MZ_B2B_PLANS).toHaveLength(8);
    expect(MZ_ALL_PLANS).toHaveLength(14);
  });

  it("slugs são únicos em todo o conjunto", () => {
    const slugs = MZ_ALL_PLANS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs B2C coincidem com migration SQL", () => {
    const expectedB2C = [
      "plus-individual",
      "plus-familia",
      "plus-gravida",
      "plus-cronico",
      "premium-individual",
      "premium-familia",
    ];
    expect(MZ_B2C_PLANS.map((p) => p.slug).sort()).toEqual(expectedB2C.sort());
  });

  it("slugs B2B coincidem com migration SQL", () => {
    const expectedB2B = [
      "doctor-pro",
      "doctor-elite",
      "clinica-basic",
      "clinica-pro",
      "hospital-enterprise",
      "pharmacy-pro",
      "lab-pro",
      "driver-plus",
    ];
    expect(MZ_B2B_PLANS.map((p) => p.slug).sort()).toEqual(expectedB2B.sort());
  });
});

describe("MZ_ALL_PLANS — campos obrigatórios", () => {
  it("cada plano tem price_mzn > 0", () => {
    for (const p of MZ_ALL_PLANS) {
      expect(p.price_mzn).toBeGreaterThan(0);
    }
  });

  it("cada plano tem pelo menos 3 features", () => {
    for (const p of MZ_ALL_PLANS) {
      expect(p.features.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("cada plano tem name, tagline, description, cta não vazios", () => {
    for (const p of MZ_ALL_PLANS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.tagline.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.cta.length).toBeGreaterThan(0);
    }
  });

  it("cada plano tem period_months = 1 (todos mensais por defeito)", () => {
    for (const p of MZ_ALL_PLANS) {
      expect(p.period_months).toBe(1);
    }
  });

  it("kind está correcto (b2c vs b2b)", () => {
    for (const p of MZ_B2C_PLANS) expect(p.kind).toBe("b2c");
    for (const p of MZ_B2B_PLANS) expect(p.kind).toBe("b2b");
  });
});

describe("BILLING_DISCOUNT", () => {
  it("tem 3 ciclos: monthly, quarterly, yearly", () => {
    expect(Object.keys(BILLING_DISCOUNT).sort()).toEqual(["monthly", "quarterly", "yearly"]);
  });

  it("monthly multiplier = 1, quarterly > 2, yearly > 9", () => {
    expect(BILLING_DISCOUNT.monthly.multiplier).toBe(1);
    expect(BILLING_DISCOUNT.quarterly.multiplier).toBeGreaterThan(2);
    expect(BILLING_DISCOUNT.yearly.multiplier).toBeGreaterThan(9);
  });

  it("trimestral poupa vs 3× mensal (multiplier < 3)", () => {
    expect(BILLING_DISCOUNT.quarterly.multiplier).toBeLessThan(3);
  });

  it("anual poupa vs 12× mensal (multiplier < 12)", () => {
    expect(BILLING_DISCOUNT.yearly.multiplier).toBeLessThan(12);
  });
});

describe("Helpers — getPlanBySlug", () => {
  it("encontra plano B2C por slug", () => {
    const p = getPlanBySlug("plus-gravida");
    expect(p).toBeDefined();
    expect(p?.name).toBe("Plus Grávida");
    expect(p?.price_mzn).toBe(299);
  });

  it("encontra plano B2B por slug", () => {
    const p = getPlanBySlug("hospital-enterprise");
    expect(p).toBeDefined();
    expect(p?.name).toBe("Hospital Enterprise");
    expect(p?.price_mzn).toBe(45000);
  });

  it("retorna undefined para slug inexistente", () => {
    expect(getPlanBySlug("plano-inexistente")).toBeUndefined();
  });
});

describe("Helpers — getB2CPlanByAudience", () => {
  it("encontra plano por audience 'gravida'", () => {
    const p = getB2CPlanByAudience("gravida");
    expect(p?.slug).toBe("plus-gravida");
  });

  it("retorna undefined para audience inexistente", () => {
    expect(getB2CPlanByAudience("nao-existe" as any)).toBeUndefined();
  });
});

describe("Helpers — getB2BPlansByAudience", () => {
  it("filtra planos doctor (devolve 2)", () => {
    const docs = getB2BPlansByAudience("doctor");
    expect(docs).toHaveLength(2);
    expect(docs.map((p) => p.slug).sort()).toEqual(["doctor-elite", "doctor-pro"]);
  });

  it("filtra planos clinic (devolve 2)", () => {
    const clinics = getB2BPlansByAudience("clinic");
    expect(clinics).toHaveLength(2);
  });

  it("filtra planos hospital (devolve 1)", () => {
    const hospitals = getB2BPlansByAudience("hospital");
    expect(hospitals).toHaveLength(1);
    expect(hospitals[0].slug).toBe("hospital-enterprise");
  });
});

describe("computePrice", () => {
  it("mensal = preço base", () => {
    const plan = MZ_B2C_PLANS[0]; // plus-individual, 199
    expect(computePrice(plan, "monthly")).toBe(199);
  });

  it("trimestral = base × 2.7 (arredondado)", () => {
    const plan = MZ_B2C_PLANS[0]; // 199 × 2.7 = 537.3 → 537
    expect(computePrice(plan, "quarterly")).toBe(537);
  });

  it("anual = base × 10 (arredondado)", () => {
    const plan = MZ_B2C_PLANS[0]; // 199 × 10 = 1990
    expect(computePrice(plan, "yearly")).toBe(1990);
  });
});

describe("computePeriodMonths", () => {
  it("monthly → 1, quarterly → 3, yearly → 12", () => {
    expect(computePeriodMonths("monthly")).toBe(1);
    expect(computePeriodMonths("quarterly")).toBe(3);
    expect(computePeriodMonths("yearly")).toBe(12);
  });
});

describe("computeExpiry", () => {
  it("mensal: expira ~30 dias no futuro", () => {
    const expiry = new Date(computeExpiry("monthly"));
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(28);
    expect(diffDays).toBeLessThan(33);
  });

  it("anual: expira ~365 dias no futuro", () => {
    const expiry = new Date(computeExpiry("yearly"));
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(360);
    expect(diffDays).toBeLessThan(370);
  });
});

describe("formatMZN", () => {
  it("formata inteiro em pt-MZ", () => {
    expect(formatMZN(199)).toBe("199");
  });

  it("formata milhar com separador", () => {
    // pt-MZ usa espaço como separador de milhar
    const formatted = formatMZN(45000);
    expect(formatted).toMatch(/45[.\s\u202F]?000/);
  });
});

describe("fetchPlanBySlug — fallback em memória", () => {
  beforeEach(() => {
    // Mock já configurado no topo — BD sempre falha, deve cair em memória
  });

  it("retorna plano da memória quando BD falha", async () => {
    const p = await fetchPlanBySlug("plus-gravida");
    expect(p).not.toBeNull();
    expect(p?.name).toBe("Plus Grávida");
    expect(p?.price_mzn).toBe(299);
  });

  it("retorna null para slug inexistente em memória E BD", async () => {
    const p = await fetchPlanBySlug("plano-fake-12345");
    expect(p).toBeNull();
  });
});

describe("seedMzPlans — upsert", () => {
  it("não lança mesmo quando BD falha", async () => {
    const result = await seedMzPlans();
    expect(result).toBeDefined();
    expect(typeof result.seeded).toBe("number");
    expect(Array.isArray(result.failed)).toBe(true);
  });
});
