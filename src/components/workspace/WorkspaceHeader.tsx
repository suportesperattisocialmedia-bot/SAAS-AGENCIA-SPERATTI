import React from 'react';
import { Client, InstagramAccount } from '../../types';
import {
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  TrendingUp,
  Swords,
  Search,
  Lightbulb,
  FileText,
  History,
  Activity,
  Link2
} from 'lucide-react';
import { ASSETS } from '../../data/assets';

export type WorkspaceSubTab =
  | 'overview'
  | 'instagram'
  | 'diagnostic'
  | 'performance'
  | 'content'
  | 'competitors'
  | 'research'
  | 'ideas'
  | 'calendar'
  | 'reports'
  | 'history';

interface WorkspaceHeaderProps {
  client: Client;
  account: InstagramAccount | null;
  activeTab: WorkspaceSubTab;
  onTabChange: (tab: WorkspaceSubTab) => void;
  onBackToClients: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onAnalyzeProfile: () => void;
  isAnalyzing: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  client,
  account,
  activeTab,
  onTabChange,
  onBackToClients,
  onSync,
  isSyncing,
  onAnalyzeProfile,
  isAnalyzing
}) => {
  const isDrRavi = client.instagram.toLowerCase().includes('ravi');
  const avatarUrl = isDrRavi ? ASSETS.raviPortrait : client.avatarUrl;

  const tabs: Array<{ id: WorkspaceSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'instagram', label: 'Conectar Instagram', icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'diagnostic', label: 'Diagnóstico', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'content', label: 'Conteúdo', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'competitors', label: 'Concorrentes', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'research', label: 'Pesquisa', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'ideas', label: 'Banco de Ideias', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: 'calendar', label: 'Calendário', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Relatórios', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="bg-neutral-950 border-b border-neutral-800 -mx-4 sm:-mx-6 -mt-6 mb-6 px-4 sm:px-6 pt-6">
      {/* Top action row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToClients}
            className="p-2 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 border border-neutral-800 transition-colors"
            title="Voltar para lista de clientes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={client.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-base font-bold font-mono text-amber-400">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-100">{client.name}</h1>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                  {client.instagram}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5">
                <span>{client.company}</span>
                <span>·</span>
                <span className="text-neutral-300">{client.segment}</span>
                {account?.isConnected && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Sincronizado
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-end lg:self-center">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg text-xs font-mono font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span>{isSyncing ? 'Sincronizando Meta API...' : 'Sincronizar Agora'}</span>
          </button>

          <button
            onClick={onAnalyzeProfile}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-60"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
            <span>{isAnalyzing ? 'Analisando Perfil...' : 'Analisar Perfil'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-neutral-900 pt-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-amber-500 text-amber-300 font-semibold bg-neutral-900/40'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              <span className={isActive ? 'text-amber-400' : 'text-neutral-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
