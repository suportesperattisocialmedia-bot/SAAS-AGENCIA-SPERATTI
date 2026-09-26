import React from 'react';
import { Search, Plus, Bell, RefreshCw, Menu, ChevronRight } from 'lucide-react';
import { Client } from '../../types';

interface HeaderProps {
  activeClient: Client | null;
  clients: Client[];
  currentSectionTitle: string;
  onOpenSearch: () => void;
  onOpenNewClient: () => void;
  onSyncCurrentClient?: () => void;
  isSyncing?: boolean;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  onToggleMobileMenu: () => void;
  onSelectClient: (client: Client | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeClient,
  clients,
  currentSectionTitle,
  onOpenSearch,
  onOpenNewClient,
  onSyncCurrentClient,
  isSyncing = false,
  unreadAlertsCount,
  onOpenAlerts,
  onToggleMobileMenu,
  onSelectClient
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Breadcrumbs & Client Switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-900"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono truncate">
          <span className="text-neutral-300 font-medium">Agência</span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
          
          {activeClient ? (
            <div className="flex items-center gap-1.5 truncate">
              <select aria-label="Cliente ativo"
                value={activeClient.id}
                onChange={(e) => {
                  const found = clients.find(c => c.id === e.target.value);
                  onSelectClient(found || null);
                }}
                className="bg-neutral-900 border border-neutral-800 text-amber-300 font-semibold px-2 py-0.5 rounded text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer truncate max-w-[180px]"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0 hidden sm:block" />
              <span className="text-neutral-200 truncate hidden sm:inline">{currentSectionTitle}</span>
            </div>
          ) : (
            <span className="text-neutral-200 font-medium truncate">{currentSectionTitle}</span>
          )}
        </div>
      </div>

      {/* Zone 2: Global Search Trigger (Ctrl + K) */}
      <div className="flex-1 max-w-md hidden md:flex items-center">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg text-xs transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300" />
            <span>Buscar clientes, conteúdos, ideias, concorrentes...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-900"
          title="Buscar (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenAlerts}
          className="relative p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition-colors"
          title="Central de Alertas"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
          )}
        </button>

        {activeClient && onSyncCurrentClient && (
          <button
            onClick={onSyncCurrentClient}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            title="Sincronizar Instagram deste cliente"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        )}

        <button
          onClick={onOpenNewClient}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </button>
      </div>
    </header>
  );
};
