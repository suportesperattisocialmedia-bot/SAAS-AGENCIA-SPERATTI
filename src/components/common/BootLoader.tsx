/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Professional Application Boot Loader
 */

import React from 'react';
import { Shield, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface BootLoaderProps {
  error?: string | null;
  onRetry?: () => void;
}

export const BootLoader: React.FC<BootLoaderProps> = ({ error, onRetry }) => {
  if (error) {
    return (
      <div className="fixed inset-0 bg-white/[0.03] flex items-center justify-center p-6 z-50">
        <div className="max-w-md w-full bg-[#161618] border border-white/[0.06] rounded-[24px] p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100">Falha na Inicialização</h2>
            <p className="text-xs text-neutral-400 mt-1 tabular-nums">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-full text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white/[0.03] flex items-center justify-center p-6 z-50">
      <div className="text-center space-y-4 max-w-sm">
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 tabular-nums font-bold text-lg">
            GS
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white/[0.03] rounded-full p-1 border border-white/[0.06]">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
        </div>

        <div>
          <div className="text-sm font-bold text-neutral-200">
            Gabriel Speratti
          </div>
          <div className="text-[11px] text-amber-400/90 mt-0.5">
            Social Intelligence
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="text-[11px] text-neutral-400 tabular-nums">
            Verificando integridade e carregando workspaces...
          </div>
          <div className="w-48 h-1 bg-[#161618] rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-amber-500/80 rounded-full animate-pulse w-3/4" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 tabular-nums pt-4 border-t border-white/[0.04]">
          <Shield className="w-3 h-3 text-emerald-400/70" />
          <span>Carregando seus dados</span>
        </div>
      </div>
    </div>
  );
};
