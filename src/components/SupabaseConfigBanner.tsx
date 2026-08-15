import { AlertTriangle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

/**
 * Banner vermelho visível quando VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY
 * não estão configuradas. Mostra instruções claras para o admin.
 */
export function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-3 text-center font-semibold text-sm shadow-lg">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>
          Supabase não configurado. Adicione{' '}
          <code className="bg-red-700 px-1.5 py-0.5 rounded text-xs font-mono">VITE_SUPABASE_URL</code>{' '}
          e{' '}
          <code className="bg-red-700 px-1.5 py-0.5 rounded text-xs font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
          nas variáveis de ambiente do deploy e faça um novo deploy.
        </span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </div>
    </div>
  );
}
