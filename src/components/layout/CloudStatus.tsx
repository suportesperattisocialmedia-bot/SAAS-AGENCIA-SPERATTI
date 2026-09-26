import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudAlert, Loader2, CloudCheck } from 'lucide-react';
import { syncService, type SyncStatus } from '../../services/sync/syncService';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Estado da cópia na nuvem. Clicar força uma sincronização. */
export const CloudStatus: React.FC = () => {
  const [s, setS] = useState<SyncStatus>(syncService.getStatus());
  useEffect(() => syncService.onStatus(setS), []);
  if (s.state === 'disabled') return null;

  const view = {
    saved: { Icon: CloudCheck, label: 'Salvo', tone: 'text-emerald-400', title: `Dados salvos na nuvem ${timeAgo(s.lastSyncedAt)}` },
    pending: { Icon: Cloud, label: 'Salvando', tone: 'text-neutral-400', title: 'Alterações serão enviadas em instantes' },
    syncing: { Icon: Loader2, label: 'Sincronizando', tone: 'text-amber-400', title: 'Sincronizando com a nuvem' },
    offline: { Icon: CloudOff, label: 'Offline', tone: 'text-neutral-400', title: s.message ?? 'Sem conexão' },
    error: { Icon: CloudAlert, label: 'Erro', tone: 'text-rose-400', title: s.message ?? 'Falha ao sincronizar' }
  }[s.state];

  return (
    <button
      type="button"
      onClick={() => void syncService.refresh()}
      title={`${view.title}. Clique para sincronizar agora.`}
      aria-label={`Nuvem: ${view.label}. ${view.title}`}
      data-sync-state={s.state}
      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
    >
      <view.Icon className={`h-3.5 w-3.5 ${view.tone} ${s.state === 'syncing' ? 'animate-spin motion-reduce:animate-none' : ''}`} />
      <span className="hidden xl:inline">{view.label}</span>
    </button>
  );
};
