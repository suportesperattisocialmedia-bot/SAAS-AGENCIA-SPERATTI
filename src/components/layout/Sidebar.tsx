import React from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Swords,
  Search,
  Lightbulb,
  CalendarDays,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Database
} from 'lucide-react';
import { Client } from '../../types';
import { ASSETS } from '../../data/assets';

export type MainNavSection = 
  | 'dashboard'
  | 'clients'
  | 'performance'
  | 'competitors'
  | 'research'
  | 'ideas'
  | 'calendar'
  | 'reports'
  | 'alerts'
  | 'settings';

interface SidebarProps {
  currentSection: MainNavSection;
  onNavigate: (section: MainNavSection) => void;
  clients: Client[];
  activeClient: Client | null;
  onSelectClient: (client: Client | null) => void;
  unreadAlertsCount: number;
  isDemoLoaded: boolean;
  onToggleDemoData: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userName?: string | null;
  userRole?: string | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  clients,
  activeClient,
  onSelectClient,
  unreadAlertsCount,
  isDemoLoaded,
  onToggleDemoData,
  isOpenMobile,
  onCloseMobile,
  userName,
  userRole,
  onLogout
}) => {
  const navItems: Array<{ id: MainNavSection; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="w-4 h-4" />, badge: clients.length },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'competitors', label: 'Concorrentes', icon: <Swords className="w-4 h-4" /> },
    { id: 'research', label: 'Pesquisa', icon: <Search className="w-4 h-4" /> },
    { id: 'ideas', label: 'Banco de Ideias', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendário', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'reports', label: 'Relatórios', icon: <FileText className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alertas', icon: <Bell className="w-4 h-4" />, badge: unreadAlertsCount },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-wider font-mono">
              GS
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-neutral-100 uppercase">
                Gabriel Speratti
              </div>
              <div className="text-[10px] tracking-wider text-amber-400/90 font-mono uppercase mt-0.5">
                Social Intelligence
              </div>
            </div>
          </div>

          {/* Active Client Context Banner */}
          {activeClient ? (
            <div className="mt-4 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] font-mono text-neutral-400 uppercase">Workspace Ativo</div>
                <div className="text-xs font-semibold text-neutral-200 truncate">{activeClient.name}</div>
                <div className="text-[11px] font-mono text-amber-400/80 truncate">{activeClient.instagram}</div>
              </div>
              <button
                onClick={() => onSelectClient(null)}
                className="text-[10px] text-neutral-400 hover:text-neutral-200 px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors shrink-0"
                title="Voltar para visão consolidada da agência"
              >
                Geral
              </button>
            </div>
          ) : (
            <div className="mt-4 px-2.5 py-1.5 bg-neutral-900/60 border border-neutral-800/60 rounded-lg flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>Visão Consolidada</span>
              <span className="text-neutral-500">{clients.length} clientes</span>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-neutral-800/90 text-amber-300 font-semibold border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile & Demo Trigger */}
        <div className="p-3 border-t border-neutral-800 space-y-2">
          {/* Demo Data Quick Switch */}
          <button
            onClick={onToggleDemoData}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono rounded border transition-colors ${
              isDemoLoaded
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              {isDemoLoaded ? 'Sair da demonstração' : 'Ver demonstração'}
            </span>
            <span className="text-[9px] uppercase px-1 py-0.2 bg-neutral-800 rounded">
              {isDemoLoaded ? 'Limpar' : 'Demo'}
            </span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
            <img
              src={ASSETS.gabrielPortrait}
              alt="Gabriel Speratti"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
              onError={(e) => {
                // Fallback avatar
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-neutral-200 truncate">{userName || 'Modo demonstração'}</div>
              <div className="text-[10px] text-neutral-500 font-mono truncate">
                {userRole === 'owner' ? 'Proprietário' : userRole === 'admin' ? 'Administrador' : userRole ? 'Equipe' : 'Sem login'}
              </div>
            </div>
            {onLogout ? (
              <button onClick={onLogout} className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800" aria-label="Sair" title="Sair">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
