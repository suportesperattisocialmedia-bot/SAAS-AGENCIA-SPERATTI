import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PlugZap, RefreshCw, ShieldAlert, Unplug, Wrench } from 'lucide-react';
import type { InstagramConnectionStatus } from '../../types';

/** Rótulos e estilo de cada estado REAL da conexão Instagram. */
export const CONNECTION_STATE: Record<InstagramConnectionStatus, { label: string; tone: string; icon: React.ReactNode; description: string }> = {
  NOT_CONFIGURED: {
    label: 'Instagram API não configurada',
    tone: 'text-neutral-400 border-white/[0.1] bg-[#161618]',
    icon: <Wrench className="w-3 h-3" />,
    description: 'O servidor ainda não possui META_APP_ID, META_APP_SECRET e META_REDIRECT_URI.'
  },
  DISCONNECTED: {
    label: 'Não conectado',
    tone: 'text-neutral-300 border-white/[0.1] bg-[#161618]',
    icon: <Unplug className="w-3 h-3" />,
    description: 'Nenhuma autorização OAuth ativa para este cliente.'
  },
  CONNECTING: {
    label: 'Conectando',
    tone: 'text-sky-300 border-sky-500/30 bg-sky-950/40',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    description: 'Aguardando a autorização na Meta.'
  },
  CONNECTED: {
    label: 'Instagram conectado',
    tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'Autorização OAuth válida no servidor.'
  },
  SYNCING: {
    label: 'Sincronizando',
    tone: 'text-amber-300 border-amber-500/30 bg-amber-950/40',
    icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    description: 'Coletando mídia e métricas na Meta Graph API.'
  },
  ERROR: {
    label: 'Erro',
    tone: 'text-rose-300 border-rose-500/30 bg-rose-950/40',
    icon: <AlertTriangle className="w-3 h-3" />,
    description: 'A última operação falhou. Veja os detalhes e tente novamente.'
  },
  EXPIRED: {
    label: 'Autorização expirada',
    tone: 'text-orange-300 border-orange-500/30 bg-orange-950/40',
    icon: <ShieldAlert className="w-3 h-3" />,
    description: 'O token da Meta expirou. Reconecte para retomar a coleta.'
  },
  REAUTH_REQUIRED: {
    label: 'Reconexão necessária',
    tone: 'text-orange-300 border-orange-500/30 bg-orange-950/40',
    icon: <PlugZap className="w-3 h-3" />,
    description: 'A permissão foi revogada ou alterada na Meta.'
  }
};

export const ConnectionBadge: React.FC<{ status: InstagramConnectionStatus; className?: string }> = ({ status, className = '' }) => {
  const state = CONNECTION_STATE[status] ?? CONNECTION_STATE.DISCONNECTED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${state.tone} ${className}`}
      title={state.description}
    >
      {state.icon}
      {state.label}
    </span>
  );
};
