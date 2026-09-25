/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Demo Mode Warning Banner
 */

import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';

interface DemoBannerProps {
  onExitDemo: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onExitDemo }) => {
  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-neutral-900 to-amber-950/80 border-b border-amber-500/40 px-4 lg:pl-68 py-2 flex items-center justify-between gap-3 z-30 shrink-0 relative">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold tracking-wider uppercase font-mono text-[11px]">
            Modo Demonstração Ativo
          </span>
          <span className="text-neutral-400 hidden sm:inline text-[11px]">
            Os dados exibidos (Clínica Aurora) são fictícios, criados apenas para demonstração, e não representam métricas reais.
          </span>
        </div>
      </div>

      <button
        onClick={onExitDemo}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sair da demonstração</span>
      </button>
    </div>
  );
};
