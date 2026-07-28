import { useState } from 'react';
import { MWAlertTriangle, MWRefreshCw } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';

interface ErrorRecoveryProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

/**
 * Beautiful error recovery component with retry action.
 * Used when API calls fail, lazy loading errors occur, etc.
 */
export function ErrorRecovery({
  message = 'Algo correu mal. Tenta novamente.',
  onRetry,
  fullScreen = false,
}: ErrorRecoveryProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      onRetry?.();
    }, 300);
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-6">
        <div className="text-center max-w-sm">
          <MWAlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Erro Inesperado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
          <Button
            onClick={handleRetry}
            disabled={retrying}
            className="gap-2 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 text-white"
          >
            <MWRefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'A tentar...' : 'Tentar Novamente'}
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Se o problema persistir, contacta o suporte
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <MWAlertTriangle className="w-10 h-10 mb-3 text-amber-500" />
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="gap-2"
        >
          <MWRefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'A tentar...' : 'Tentar Novamente'}
        </Button>
      )}
    </div>
  );
}
