import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black mb-2">Ops! Algo correu mal.</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Ocorreu um erro inesperado na aplicação. Por favor, tenta recarregar a página ou voltar ao início.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 font-bold gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Recarregar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1 font-bold gap-2"
            >
              <Home className="h-4 w-4" /> Início
            </Button>
          </div>

          <div className="mt-12 p-4 bg-muted rounded-xl text-left w-full max-w-2xl overflow-auto max-h-60">
            <p className="font-mono text-xs text-destructive font-bold">Erro Detalhado:</p>
            <p className="font-mono text-xs text-destructive mt-1">{this.state.error?.toString()}</p>
            {this.state.error?.stack && (
              <pre className="mt-2 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap opacity-50">
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.children;
  }
}
