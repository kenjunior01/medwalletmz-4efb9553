/**
 * Testes unitários para src/lib/mzMonetization.ts
 * Verifica o fluxo funcional de monetização MZ:
 *   - initiateSubscription: cria subscription + M-Pesa payment (mocked)
 *   - confirmSubscriptionPayment: confirma pagamento (mocked)
 *   - rejectSubscriptionPayment: rejeita pagamento (mocked)
 *   - getUserActiveSubscription: lê estado actual
 *   - getMonetizationStats: KPIs consolidados
 *   - awardCashback: chama RPC idempotente
 *   - buildMpesaInstructionsForSubscription: formata instruções
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks finos — cada função supabase devolve o que precisamos
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  },
}));

// Mock mpesa.createManualPayment
vi.mock("./mpesa", () => ({
  createManualPayment: vi.fn(async (opts: any) => ({
    id: `mock-mpesa-${Date.now()}`,
    reference: "MW-TEST01",
    amount_mzn: opts.amount_mzn,
    description: opts.description,
    status: "pending" as const,
    payer_phone: opts.payer_phone,
    payer_name: opts.payer_name,
    destination_number: "+258840000000",
    created_at: new Date().toISOString(),
    metadata: opts.metadata,
  })),
}));

import {
  initiateSubscription,
  confirmSubscriptionPayment,
  rejectSubscriptionPayment,
  getUserActiveSubscription,
  getMonetizationStats,
  awardCashback,
  buildMpesaInstructionsForSubscription,
  listPendingPaymentsForAdmin,
  listPendingSubscriptionsForAdmin,
} from "./mzMonetization";
import { MZ_B2C_PLANS } from "./mzPlans";
import type { ManualPayment } from "./mpesa";

// Helper para construir cadeia de métodos supabase
function chain(result: any, error: any = null) {
  const c: any = {
    select: vi.fn(() => c),
    insert: vi.fn(() => c),
    update: vi.fn(() => c),
    eq: vi.fn(() => c),
    order: vi.fn(() => c),
    limit: vi.fn(() => c),
    maybeSingle: vi.fn(async () => ({ data: result, error })),
    single: vi.fn(async () => ({ data: result, error })),
    upsert: vi.fn(async () => ({ error: null })),
    then: undefined,
  };
  // tornar thenable — resolved por maybeSingle/single
  return c;
}

describe("initiateSubscription", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("devolve erro NO_USER quando userId vazio", async () => {
    const result = await initiateSubscription({
      userId: "",
      planSlug: "plus-gravida",
      billing: "monthly",
      payerPhone: "+258840000000",
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("NO_USER");
  });

  it("devolve erro PLAN_NOT_FOUND quando slug não existe", async () => {
    const result = await initiateSubscription({
      userId: "user-123",
      planSlug: "plano-fake-999",
      billing: "monthly",
      payerPhone: "+258840000000",
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("PLAN_NOT_FOUND");
  });

  it("cria subscription + M-Pesa payment quando BD funciona", async () => {
    // Mock fetchPlanIdBySlug: devolve UUID válido
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscription_plans") {
        return chain({ id: "uuid-plan-123", slug: "plus-gravida" });
      }
      if (table === "subscriptions") {
        return chain({ id: "sub-uuid-123" });
      }
      return chain(null);
    });

    const result = await initiateSubscription({
      userId: "user-123",
      planSlug: "plus-gravida",
      billing: "monthly",
      payerPhone: "+258840000000",
      payerName: "test@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe("sub-uuid-123");
    expect(result.mpesaPayment).toBeDefined();
    expect(result.mpesaPayment?.reference).toBe("MW-TEST01");
    expect(result.instructions).toBeDefined();
    expect(result.instructions).toContain("Plus Grávida");
    expect(result.instructions).toContain("299");
    expect(result.instructions).toContain("MW-TEST01");
  });

  it("devolve PLAN_NO_UUID quando BD não tem o plano", async () => {
    // Mock: BD sempre devolve null
    mockFrom.mockImplementation(() => chain(null));

    const result = await initiateSubscription({
      userId: "user-123",
      planSlug: "plus-gravida",
      billing: "monthly",
      payerPhone: "+258840000000",
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("PLAN_NO_UUID");
  });
});

describe("confirmSubscriptionPayment", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("retorna true quando update tem sucesso", async () => {
    const c = chain(null);
    mockFrom.mockReturnValue(c);

    const ok = await confirmSubscriptionPayment({
      paymentId: "pmt-123",
      mpesaTransactionId: "MP240521.1234.A56789",
      adminId: "admin-456",
    });
    expect(ok).toBe(true);
    expect(c.update).toHaveBeenCalled();
    expect(c.eq).toHaveBeenCalledWith("id", "pmt-123");
  });

  it("retorna false quando update falha", async () => {
    mockFrom.mockImplementation(() => {
      const c: any = {
        update: vi.fn(() => c),
        eq: vi.fn(async () => ({ error: new Error("RLS blocked") })),
      };
      return c;
    });

    const ok = await confirmSubscriptionPayment({
      paymentId: "pmt-123",
      mpesaTransactionId: "MP999",
      adminId: "admin-456",
    });
    expect(ok).toBe(false);
  });
});

describe("rejectSubscriptionPayment", () => {
  it("retorna true quando update tem sucesso", async () => {
    mockFrom.mockReset();
    const c = chain(null);
    mockFrom.mockReturnValue(c);

    const ok = await rejectSubscriptionPayment({
      paymentId: "pmt-123",
      reason: "Tx inválido",
      adminId: "admin-456",
    });
    expect(ok).toBe(true);
  });
});

describe("getUserActiveSubscription", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("devolve status 'none' quando userId vazio", async () => {
    const info = await getUserActiveSubscription("");
    expect(info.status).toBe("none");
    expect(info.plan).toBeNull();
  });

  it("devolve status 'active' + plano quando BD tem subscrição activa", async () => {
    // Primeiro mock: subscriptions → devolve row com plan.slug
    // Segundo mock: subscription_plans (fetchPlanBySlug) → fallback memória (mockFrom devolve null)
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return chain({
          id: "sub-1",
          status: "active",
          started_at: "2026-08-01T00:00:00Z",
          expires_at: "2026-09-01T00:00:00Z",
          payment_method: "mpesa",
          amount_paid: 299,
          plan: { slug: "plus-gravida", name: "Plus Grávida", price_mzn: 299, billing_period: "monthly", target_audience: "gravida", features: [], badge: null, period_months: 1 },
        });
      }
      return chain(null);
    });

    const info = await getUserActiveSubscription("user-123");
    expect(info.status).toBe("active");
    expect(info.plan).not.toBeNull();
    expect(info.plan?.slug).toBe("plus-gravida");
    expect(info.amountPaid).toBe(299);
  });
});

describe("getMonetizationStats", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    // Cada chamada supabase.from() devolve cadeia com select().eq().[...].then() resolvida
    // Vamos devolver dados simulados
    mockFrom.mockImplementation(() => {
      const c: any = {
        select: vi.fn(() => c),
        eq: vi.fn(() => c),
        gte: vi.fn(async () => ({ data: [{ amount_mzn: 199 }], error: null })),
      };
      // Para chamadas sem gte (pending/all-confirmed)
      c.then = undefined;
      // Como usamos .then() no código, devolvemos thenable:
      const thenable = {
        select: vi.fn(() => thenable),
        eq: vi.fn(() => thenable),
        gte: vi.fn(async () => ({ data: [{ amount_mzn: 199 }], error: null })),
        then: (resolve: any) => resolve({ data: [{ amount_mzn: 199 }], error: null }),
      };
      return thenable;
    });

    // Para count queries (head: true)
    // Não chamamos .maybeSingle() nessas — usam { count, error }
    // Vamos mockar com .select('id', { count: 'exact', head: true })
  });

  it("retorna estrutura completa mesmo com BD falhando", async () => {
    // Reset mais simples — tudo devolve null/0
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(async () => ({ data: null, error: new Error("mock") })),
          then: (resolve: any) => resolve({ data: null, error: null }),
        })),
        then: (resolve: any) => resolve({ data: null, error: null }),
      })),
    }));

    const stats = await getMonetizationStats();
    expect(stats).toBeDefined();
    expect(stats.pendingPayments).toBe(0);
    expect(stats.pendingAmountMzn).toBe(0);
    expect(stats.confirmedToday).toBe(0);
    expect(stats.activeSubscriptions).toBe(0);
  });
});

describe("awardCashback", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("retorna true quando RPC wallet_credit_cashback devolve true", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const ok = await awardCashback({
      userId: "user-123",
      sourceAmount: 1000,
      pct: 2,
      source: "pharmacy_order",
      reference: "CASH-ORDER-12345",
    });
    expect(ok).toBe(true);
  });

  it("retorna false quando RPC devolve erro", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("RPC not found") });

    const ok = await awardCashback({
      userId: "user-123",
      sourceAmount: 1000,
      pct: 2,
      source: "pharmacy_order",
      reference: "CASH-ORDER-12345",
    });
    expect(ok).toBe(false);
  });
});

describe("buildMpesaInstructionsForSubscription", () => {
  it("gera instruções com nome do plano + valor + referência", () => {
    const plan = MZ_B2C_PLANS[2]; // plus-gravida, 299
    const payment: ManualPayment = {
      id: "pmt-1",
      reference: "MW-ABC123",
      amount_mzn: 299,
      description: "Subscrição Plus Grávida (monthly)",
      status: "pending",
      destination_number: "+258840000000",
      created_at: new Date().toISOString(),
    };

    const text = buildMpesaInstructionsForSubscription(payment, plan, "monthly");
    expect(text).toContain("Plus Grávida");
    expect(text).toContain("299 MZN");
    expect(text).toContain("MW-ABC123");
    expect(text).toContain("+258840000000");
    expect(text).toContain("M-Pesa");
  });

  it("inclui 3 passos numerados", () => {
    const plan = MZ_B2C_PLANS[0];
    const payment: ManualPayment = {
      id: "pmt-1",
      reference: "MW-XYZ",
      amount_mzn: 199,
      description: "Subs",
      status: "pending",
      destination_number: "+258840000000",
      created_at: new Date().toISOString(),
    };
    const text = buildMpesaInstructionsForSubscription(payment, plan, "monthly");
    expect(text).toContain("1.");
    expect(text).toContain("2.");
    expect(text).toContain("3.");
  });
});

describe("listPendingPaymentsForAdmin", () => {
  it("retorna array mesmo quando BD falha", async () => {
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: null, error: new Error("mock") })),
          })),
        })),
      })),
    }));

    const list = await listPendingPaymentsForAdmin();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(0);
  });

  it("mapeia rows da BD para o formato esperado", async () => {
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: [
                {
                  id: "pmt-1",
                  reference: "MW-001",
                  amount_mzn: 299,
                  description: "Subs Plus Grávida",
                  payer_phone: "+258840000000",
                  payer_name: "User Test",
                  created_at: "2026-08-15T10:00:00Z",
                  metadata: { subscription_id: "sub-1" },
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    }));

    const list = await listPendingPaymentsForAdmin();
    expect(list).toHaveLength(1);
    expect(list[0].reference).toBe("MW-001");
    expect(list[0].subscription_id).toBe("sub-1");
    expect(list[0].amount_mzn).toBe(299);
  });
});

describe("listPendingSubscriptionsForAdmin", () => {
  it("retorna array mesmo quando BD falha", async () => {
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: null, error: new Error("mock") })),
          })),
        })),
      })),
    }));

    const list = await listPendingSubscriptionsForAdmin();
    expect(Array.isArray(list)).toBe(true);
  });
});
