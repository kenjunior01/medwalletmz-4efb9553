import { supabase } from "@/integrations/supabase/client";

export type AppEmailTemplate = "welcome" | "order-confirmation" | "notification";

/** Envia um email da aplicação através do domínio medwalletmz.online. */
export async function sendAppEmail(params: {
  template: AppEmailTemplate;
  to: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: params.template,
      recipientEmail: params.to,
      idempotencyKey: params.idempotencyKey,
      templateData: params.data ?? {},
    },
  });
  if (error) console.error("sendAppEmail failed", error);
  return { error };
}
