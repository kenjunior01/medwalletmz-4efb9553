/**
 * ReportShell — moldura genérica para relatórios imprimíveis da MedWallet.
 *
 * Overlay escuro com pré-visualização em "folha A4" clara + barra de acções
 * ("Guardar como PDF" via window.print() — zero dependências). O conteúdo
 * específico de cada relatório entra como `children` da folha.
 *
 * Isolamento de impressão (index.css): enquanto o overlay está aberto o
 * <body> recebe a classe .print-report-open, o #root é escondido no
 * @media print e só a folha (#report-print-root) sai no papel/PDF.
 * A classe é removida ao fechar — a impressão normal da app fica intacta.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FileText } from '@/components/icons/lucide-compat';

interface ReportShellProps {
  open: boolean;
  onClose: () => void;
  /** Nome do relatório para leitores de ecrã (aria-label do diálogo). */
  label: string;
  children: ReactNode;
}

export function ReportShell({ open, onClose, label, children }: ReportShellProps) {
  // Bloqueia scroll do fundo + tecla Escape + classe de impressão no <body>.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('print-report-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('print-report-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      id="report-print-root"
      className="report-backdrop fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      {/* Barra de acções (só ecrã — não imprime) */}
      <div className="report-toolbar mx-auto mb-3 flex max-w-[820px] flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-300 sm:text-sm">
          Pré-visualização do relatório · na impressão escolhe{' '}
          <span className="font-semibold text-white">“Guardar como PDF”</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
          >
            <FileText className="h-4 w-4" /> Guardar como PDF
          </button>
        </div>
      </div>

      {/* Folha A4 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="report-paper mx-auto mb-8 max-w-[820px] rounded-2xl bg-white p-7 text-slate-900 shadow-2xl sm:p-10"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

/** Cabeçalho de marca partilhado por todos os relatórios. */
export function ReportBrand({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
      <div>
        <p className="text-lg font-bold leading-tight">MedWallet MZ</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      {meta && <div className="text-right text-[11px] leading-relaxed text-slate-500">{meta}</div>}
    </div>
  );
}

/** Rodapé de isenção partilhado por todos os relatórios. */
export function ReportFooter({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-4 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-400">
      Gerado pela MedWallet MZ · medwalletmz.online — documento informativo baseado nos registos do
      utilizador; não substitui aconselhamento clínico.
      {children ? ` ${children}` : ''}
    </p>
  );
}
