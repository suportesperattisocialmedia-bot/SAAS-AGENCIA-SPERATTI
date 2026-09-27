import { motion, useReducedMotion } from 'motion/react';
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
  Database,
  Scale,
  Receipt,
  FileSignature,
  KanbanSquare,
  Wallet,
  Briefcase,
  Star
} from 'lucide-react';
import type { AdminSection } from '../admin/AdminOverview';
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
  /** Modo Administração (financeiro): disponível só para dono/administrador fora da demonstração. */
  appMode?: 'agency' | 'admin';
  onModeChange?: (mode: 'agency' | 'admin') => void;
  adminSection?: AdminSection;
  onAdminNavigate?: (section: AdminSection) => void;
  overdueCount?: number;
  /** Perfil próprio (marca pessoal) e ação para abrir/configurar. */
  ownProfile?: Client | null;
  onOpenOwnProfile?: () => void;
  ownProfileActive?: boolean;
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
  onLogout,
  appMode = 'agency',
  onModeChange,
  adminSection = 'overview',
  onAdminNavigate,
  overdueCount = 0,
  ownProfile = null,
  onOpenOwnProfile,
  ownProfileActive = false
}) => {
  const clientCount = clients.filter((c) => !c.isOwnProfile).length;
  const admin = appMode === 'admin';
  const reduce = useReducedMotion();
  const navItems: Array<{ id: MainNavSection; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="w-4 h-4" />, badge: clientCount },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'competitors', label: 'Concorrentes', icon: <Swords className="w-4 h-4" /> },
    { id: 'research', label: 'Pesquisa', icon: <Search className="w-4 h-4" /> },
    { id: 'ideas', label: 'Banco de Ideias', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendário', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'reports', label: 'Relatórios', icon: <FileText className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alertas', icon: <Bell className="w-4 h-4" />, badge: unreadAlertsCount },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> }
  ];

  const adminItems: Array<{ id: AdminSection; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Visão geral', icon: <Scale className="w-4 h-4" /> },
    { id: 'invoices', label: 'Cobranças', icon: <Receipt className="w-4 h-4" />, badge: overdueCount },
    { id: 'contracts', label: 'Contratos', icon: <FileSignature className="w-4 h-4" /> },
    { id: 'projects', label: 'Projetos', icon: <KanbanSquare className="w-4 h-4" /> },
    { id: 'expenses', label: 'Despesas', icon: <Wallet className="w-4 h-4" /> }
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/[0.03] border-r border-white/[0.06] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-wider tabular-nums">
              GS
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-100">
                Gabriel Speratti
              </div>
              <div className="text-[11px] text-amber-400/90 mt-0.5">
                Social Intelligence
              </div>
            </div>
          </div>

          {/* Active Client Context Banner */}
          {admin ? null : activeClient ? (
            <div className="mt-4 p-2.5 bg-[#161618] border border-white/[0.06] rounded-[24px] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[11px] text-neutral-400">{activeClient.isOwnProfile ? 'Meu perfil' : 'Workspace Ativo'}</div>
                <div className="text-xs font-semibold text-neutral-200 truncate">{activeClient.name}</div>
                <div className="text-[11px] tabular-nums text-amber-400/80 truncate">{activeClient.instagram}</div>
              </div>
              <button
                onClick={() => onSelectClient(null)}
                className="text-[10px] text-neutral-400 hover:text-neutral-200 px-1.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors shrink-0"
                title="Voltar para visão consolidada da agência"
              >
                Geral
              </button>
            </div>
          ) : (
            <div className="mt-4 px-2.5 py-1.5 bg-[#161618] border border-white/[0.05] rounded-[24px] flex items-center justify-between text-[11px] text-neutral-400 tabular-nums">
              <span>Visão Consolidada</span>
              <span className="text-neutral-500">{clientCount} clientes</span>
            </div>
          )}
        </div>

        {onModeChange && (
          <div className="px-3 pt-3">
            <div className="grid grid-cols-2 rounded-full border border-white/[0.06] bg-[#161618] p-1" role="group" aria-label="Modo do sistema">
              {([
                ['agency', 'Agência', Briefcase],
                ['admin', 'Administração', Scale]
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={appMode === id}
                  onClick={() => {
                    onModeChange(id);
                    onCloseMobile();
                  }}
                  className={`relative flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors ${appMode === id ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {appMode === id && (
                    <motion.span layoutId="mode-pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full bg-amber-500" aria-hidden="true" />
                  )}
                  <Icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!admin && onOpenOwnProfile && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => {
                onOpenOwnProfile();
                onCloseMobile();
              }}
              aria-current={ownProfileActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                ownProfileActive ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/[0.06] bg-[#161618] hover:border-white/[0.14]'
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500 text-neutral-950">
                <Star className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-semibold ${ownProfileActive ? 'text-amber-300' : 'text-neutral-100'}`}>Meu perfil</span>
                <span className="block truncate text-[11px] text-neutral-500">{ownProfile ? ownProfile.instagram : 'Configurar minha marca pessoal'}</span>
              </span>
            </button>
          </div>
        )}

        {/* Navigation items */}
        {admin ? (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Administração">
          {adminItems.map((item) => {
            const isActive = adminSection === item.id;
            return (
              <button
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onAdminNavigate?.(item.id);
                  onCloseMobile();
                }}
                className={`relative w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-2xl transition-colors group ${
                  isActive ? 'text-amber-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                    className="absolute inset-0 rounded-2xl border border-white/[0.08] bg-neutral-800/90"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <span className={isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="relative rounded-full bg-rose-500/20 px-1.5 text-[10px] tabular-nums text-rose-300" aria-label={`${item.badge} vencidas`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => {
              onNavigate('settings');
              onCloseMobile();
            }}
            className="relative w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-2xl text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
          >
            <span className="text-neutral-500"><Settings className="w-4 h-4" /></span>
            <span>Configurações</span>
          </button>
        </nav>
        ) : (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            // No Meu perfil só o atalho próprio fica destacado.
            const isActive = !ownProfileActive && currentSection === item.id;
            return (
              <button
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`relative w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-2xl transition-colors group ${
                  isActive
                    ? 'text-amber-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                }`}
              >
                {/* Destaque que desliza até o item ativo */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                    className="absolute inset-0 rounded-2xl border border-white/[0.08] bg-neutral-800/90"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <span className={isActive ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`relative text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-white/[0.06] text-neutral-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        )}

        {/* Bottom Profile & Demo Trigger */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          {/* Demo Data Quick Switch */}
          {!admin && (
          <button
            onClick={onToggleDemoData}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] tabular-nums rounded-2xl border transition-colors ${
              isDemoLoaded
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-[#161618] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              {isDemoLoaded ? 'Sair da demonstração' : 'Ver demonstração'}
            </span>
            <span className="text-[9px] px-1 py-0.2 bg-white/[0.06] rounded-full">
              {isDemoLoaded ? 'Limpar' : 'Demo'}
            </span>
          </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[24px] bg-[#161618] border border-white/[0.05]">
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
              <div className="text-[10px] text-neutral-500 tabular-nums truncate">
                {userRole === 'owner' ? 'Proprietário' : userRole === 'admin' ? 'Administrador' : userRole ? 'Equipe' : 'Sem login'}
              </div>
            </div>
            {onLogout ? (
              <button onClick={onLogout} className="p-1.5 rounded-2xl text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.07]" aria-label="Sair" title="Sair">
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
