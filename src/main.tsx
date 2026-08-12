import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logError, SESSION_ID } from "./lib/logger";

// Garantir que React está disponível globalmente se alguma lib antiga precisar
if (typeof window !== 'undefined') {
  (window as any).React = React;
  console.info(`[MedWallet] sessão de diagnóstico: ${SESSION_ID} — use window.__medwalletLogs para ver os logs`);
  window.addEventListener('unhandledrejection', (event) => {
    logError('global', 'Promessa rejeitada sem tratamento', event.reason);
  });
}

// Captura erros globais antes mesmo do React carregar
window.onerror = function(message, source, lineno, colno, error) {
  logError('global', String(message), { source, lineno, colno, stack: error?.stack });
  const container = document.getElementById("root");
  if (container && container.innerHTML === "") {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #e11d48;">Erro de Carregamento</h1>
        <p>Ocorreu um erro crítico ao iniciar a aplicação.</p>
        <p style="font-size: 12px; color: #666;">${message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #047857; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Recarregar Página</button>
      </div>
    `;
  }
  return false;
};

const container = document.getElementById("root");

if (!container) {
  console.error("Erro fatal: Elemento #root não encontrado no DOM.");
} else {
  try {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Erro durante a renderização inicial:", error);
    if (container) {
      container.innerHTML = `<div style="padding: 20px; text-align: center;"><h1>Erro de Inicialização</h1><p>Não foi possível carregar a aplicação. Por favor, recarregue a página.</p></div>`;
    }
  }
}
