import { formatDateTimeBR } from '../../utils/dates';
import React, { useEffect, useState } from 'react';
import { Client, InstagramAccount } from '../../types';
import { instagramService } from '../../services/instagramService';
import { notificationService } from '../../services/notificationService';
import { storageService } from '../../services/storageService';
import { DemoProvider } from '../../services/demo/DemoProvider';
import { describeApiError } from '../../services/api/apiClient';
import { ConnectionBadge, CONNECTION_STATE } from '../common/ConnectionBadge';
import { Instagram, KeyRound, Link2, Loader2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';

interface InstagramConnectTabProps {
  client: Client;
  account: InstagramAccount;
  onRefreshAccount: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
  instagram_basic: 'Perfil e mídia',
  instagram_manage_insights: 'Métricas (insights)',
  pages_show_list: 'Lista de páginas',
  pages_read_engagement: 'Engajamento da página',
  business_management: 'Gerenciador de negócios'
};

function formatDateTime(value?: string | null): string {
  if (!value) return 'Nunca';
  return formatDateTimeBR(value);
}

export const InstagramConnectTab: React.FC<InstagramConnectTabProps> = ({ client, account, onRefreshAccount, onSync, isSyncing }) => {
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'refresh' | null>(null);
  const isDemo = client.id === DemoProvider.getDemoClientId();
  const status = isSyncing ? 'SYNCING' : account.status;
  const state = CONNECTION_STATE[status];
  const syncLogs = storageService.syncLogs.getByClient(client.id).slice(0, 5);
  const canConnect = !isDemo && status !== 'NOT_CONFIGURED' && status !== 'CONNECTING';
  const needsReconnect = status === 'EXPIRED' || status === 'REAUTH_REQUIRED';

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    setBusy('refresh');
    instagramService.checkStatus(client.id).finally(() => {
      if (!active) return;
      setBusy(null);
      onRefreshAccount();
    });
    return () => {
      active = false;
    };
    // Revalida o estado real sempre que o cliente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, isDemo]);

  const handleConnect = async () => {
    setBusy('connect');
    try {
      await instagramService.beginOAuth(client.id);
      // O navegador será redirecionado para a Meta; o estado final chega pelo callback.
    } catch (err) {
      notificationService.showToast(describeApiError(err, 'Não foi possível iniciar a conexão.'), 'error');
      setBusy(null);
      onRefreshAccount();
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(`Desconectar ${client.instagram}? O token será apagado do servidor. O histórico já sincronizado continua salvo.`)) return;
    setBusy('disconnect');
    try {
      await instagramService.disconnectAccount(client.id);
      notificationService.showToast('Instagram desconectado.', 'info');
    } catch (err) {
      notificationService.showToast(describeApiError(err, 'Falha ao desconectar.'), 'error');
    } finally {
      setBusy(null);
      onRefreshAccount();
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
              <Instagram className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-100">
                  {account.username ? `@${account.username}` : client.instagram}
                </h3>
                <ConnectionBadge status={status} />
                {busy === 'refresh' && <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" aria-label="Verificando status" />}
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                {isDemo ? 'Cliente de demonstração: nenhuma conexão real com a Meta é feita.' : state.description}
              </p>
              {account.errorStatus && (status === 'ERROR' || needsReconnect || status === 'NOT_CONFIGURED') && (
                <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/20 rounded-lg px-3 py-2">{account.errorStatus}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {account.isConnected ? (
              <>
                <button
                  onClick={onSync}
                  disabled={isSyncing || busy !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 text-sm font-semibold transition disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={busy !== null || isSyncing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm transition disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4" />
                  Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={!canConnect || busy !== null}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {status === 'NOT_CONFIGURED' ? 'Instagram API não configurada' : needsReconnect ? 'Reconectar Instagram' : 'Conectar Instagram'}
              </button>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutral-800 pt-5 text-sm">
          <div>
            <dt className="text-xs text-neutral-500">Última sincronização</dt>
            <dd className="text-neutral-200 mt-0.5">{formatDateTime(account.lastSyncAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Autorização válida até</dt>
            <dd className="text-neutral-200 mt-0.5">{account.tokenExpiresAt ? formatDateTime(account.tokenExpiresAt) : 'n/d'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Conta profissional (ID)</dt>
            <dd className="text-neutral-200 mt-0.5 font-mono text-xs break-all">{account.accountId || 'n/d'}</dd>
          </div>
        </dl>

        {account.permissions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {account.permissions.map((scope) => (
              <span key={scope} className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400">
                {SCOPE_LABELS[scope] ?? scope}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-neutral-100 mb-3">Histórico de sincronização</h4>
          {syncLogs.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma sincronização registrada ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {syncLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-neutral-200">{formatDateTime(log.startedAt)}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {log.status === 'ERROR' ? log.errors[0] ?? 'Falha' : `${log.recordsFetched} mídias, ${log.recordsCreated} novas, ${log.recordsUpdated} atualizadas`}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md border shrink-0 ${
                      log.status === 'SUCCESS'
                        ? 'text-emerald-300 border-emerald-500/30'
                        : log.status === 'PARTIAL'
                          ? 'text-amber-300 border-amber-500/30'
                          : 'text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {log.status === 'SUCCESS' ? 'Sucesso' : log.status === 'PARTIAL' ? 'Parcial' : 'Erro'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3 text-sm text-neutral-400">
          <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Como a conexão é protegida
          </h4>
          <p className="flex gap-2">
            <KeyRound className="w-4 h-4 mt-0.5 shrink-0 text-neutral-500" />
            O login acontece na Meta. O token fica criptografado no servidor e nunca chega ao navegador.
          </p>
          <p>Requer uma conta Instagram profissional vinculada a uma Página do Facebook.</p>
          <p>Métricas que a Meta não fornece aparecem como “n/d”, nunca como zero.</p>
        </div>
      </section>
    </div>
  );
};
