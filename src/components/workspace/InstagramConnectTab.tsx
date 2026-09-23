import React, { useState } from 'react';
import { Client, InstagramAccount } from '../../types';
import { instagramService } from '../../services/instagramService';
import { notificationService } from '../../services/notificationService';
import {
  Link2,
  RefreshCw,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  KeyRound,
  ExternalLink,
  Layers
} from 'lucide-react';

interface InstagramConnectTabProps {
  client: Client;
  account: InstagramAccount;
  onRefreshAccount: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const InstagramConnectTab: React.FC<InstagramConnectTabProps> = ({
  client,
  account,
  onRefreshAccount,
  onSync,
  isSyncing
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [appId, setAppId] = useState(account.appId || '');
  const [accountId, setAccountId] = useState(account.accountId || '');
  const [serverTokenConfigured, setServerTokenConfigured] = useState(true);

  const isConnected = account.isConnected;

  const handleConnect = async () => {
    await instagramService.connectAccount(client.id, client.instagram, { appId, accountId });
    notificationService.addNotification(
      'Conta Conectada',
      `Conta ${client.instagram} conectada com sucesso ao workspace.`,
      'success'
    );
    onRefreshAccount();
  };

  const handleDisconnect = () => {
    if (window.confirm(`Deseja realmente desconectar o perfil ${client.instagram}? Os dados históricos salvos permanecerão preservados.`)) {
      instagramService.disconnectAccount(client.id);
      notificationService.addNotification(
        'Conta Desconectada',
        `A conta ${client.instagram} foi desconectada.`,
        'warning'
      );
      onRefreshAccount();
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* Real-world Meta Graph API Status Notice */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100">
                  Integração Meta Graph API para Instagram Business
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isConnected
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}>
                  {isConnected ? 'CONECTADA' : 'DESCONECTADA'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Cada cliente na agência Gabriel Speratti possui sua própria credencial de acesso individual, garantindo total isolamento de dados e conformidade com as diretrizes da Meta.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-mono transition-colors shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Credenciais Meta</span>
          </button>
        </div>

        {/* Credentials Form Drawer */}
        {showConfigModal && (
          <div className="mt-5 pt-5 border-t border-neutral-800/80 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="text-xs font-mono uppercase text-amber-400 font-semibold">
              Configuração de Conexão Oficial (Produção / Sandbox)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-neutral-400 mb-1">Meta App ID (Client ID)</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Ex: 104829582910482"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-200"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Instagram Business Account ID</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Ex: 178414058291823"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-200"
                />
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg text-[11px] text-neutral-400">
              <span className="text-amber-400 font-semibold">Protocolo de Segurança:</span> Segredos da aplicação (`APP_SECRET` e `ACCESS_TOKEN`) são gerenciados exclusivamente no ambiente seguro do servidor e jamais expostos no código cliente.
            </div>
          </div>
        )}
      </div>

      {/* Account Details Box */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-5">
        <h4 className="text-xs font-mono uppercase text-neutral-400 font-semibold">
          Parâmetros da Conta de Destino
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-neutral-500 mb-1">Perfil Alvo</div>
            <div className="text-sm font-bold font-mono text-amber-300 truncate">
              {client.instagram}
            </div>
            <div className="text-xs text-neutral-400 truncate mt-0.5">{client.name}</div>
          </div>

          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-neutral-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Última Sincronização
            </div>
            <div className="text-xs font-mono text-neutral-200 font-medium">
              {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString('pt-BR') : 'Nunca sincronizado'}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              Próxima: {account.nextSyncScheduled ? new Date(account.nextSyncScheduled).toLocaleDateString('pt-BR') : 'Automática'}
            </div>
          </div>

          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-neutral-500 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Permissões Meta
            </div>
            <div className="text-xs text-neutral-300 font-mono">
              3 escopos autorizados
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate">
              instagram_basic, insights, pages
            </div>
          </div>
        </div>

        {/* Permissions Checklist */}
        <div className="p-4 bg-neutral-950/40 border border-neutral-800/60 rounded-lg space-y-2">
          <div className="text-xs font-medium text-neutral-300 mb-2">Permissões de Acesso aos Dados:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>instagram_basic</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>instagram_manage_insights</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>pages_read_engagement</span>
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-rose-950/30 text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-900/50 rounded-lg text-xs transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Conectar Instagram de {client.name}</span>
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-neutral-500">
            Status: {isSyncing ? 'Sincronizando...' : isConnected ? 'Sincronizado' : 'Aguardando Conexão'}
          </div>
        </div>
      </div>
    </div>
  );
};
