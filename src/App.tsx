/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Aplicação Interna de Inteligência, Estratégia e Operação de Marketing Digital
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Client,
  InstagramAccount,
  AccountSnapshot,
  Content,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert,
  Report
} from './types';
import { storageService } from './services/storageService';
import { instagramService } from './services/instagramService';
import { aiService, ProfileDiagnosticResult } from './services/aiService';
import { notificationService, notificationStore } from './services/notifications/NotificationStore';
import { alertEngine } from './services/alerts/alertEngine';
import { migrationEngine } from './services/storage/migration';
import { logger } from './utils/logger';
import { sessionService, type BackendStatus, type SessionUser } from './services/sessionService';
import { describeApiError } from './services/api/apiClient';
import { DemoProvider } from './services/demo/DemoProvider';
import { LoginScreen } from './components/auth/LoginScreen';
import { ManualAiModal } from './components/common/ManualAiModal';
import { buildDiagnosticPrompt, parseDiagnosticResponse } from './ai/manualPrompts';
import { ProfileDiagnosticResponseSchema } from './schemas/aiSchemas';

// Layout & Common Components
import { Sidebar, MainNavSection } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { BootLoader } from './components/common/BootLoader';
import { DemoBanner } from './components/common/DemoBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Agency Views & Modals
import { AgencyDashboardView } from './components/agency/AgencyDashboardView';
import { AlertsCenterModal } from './components/agency/AlertsCenterModal';
import { SettingsModal } from './components/agency/SettingsModal';
import { ClientFormModal } from './components/clients/ClientFormModal';
import { ToastContainer } from './components/common/ToastContainer';

// Workspace Components
import { WorkspaceHeader, WorkspaceSubTab } from './components/workspace/WorkspaceHeader';
import { ClientOverviewTab } from './components/workspace/ClientOverviewTab';
import { InstagramConnectTab } from './components/workspace/InstagramConnectTab';
import { MetricsTab } from './components/workspace/MetricsTab';
import { DiagnosticTab } from './components/workspace/DiagnosticTab';
import { PerformanceTab } from './components/workspace/PerformanceTab';
import { ContentTab } from './components/workspace/ContentTab';
import { CompetitorTab } from './components/workspace/CompetitorTab';
import { AudienceTab } from './components/workspace/AudienceTab';
import { IdeasTab } from './components/workspace/IdeasTab';
import { CalendarTab } from './components/workspace/CalendarTab';
import { ReportsTab } from './components/workspace/ReportsTab';
import { HistoryTab } from './components/workspace/HistoryTab';

/** Itens do menu lateral que abrem uma aba do workspace do cliente. */
const SECTION_TO_TAB: Partial<Record<MainNavSection, WorkspaceSubTab>> = {
  performance: 'performance',
  competitors: 'competitors',
  research: 'research',
  ideas: 'ideas',
  calendar: 'calendar',
  reports: 'reports'
};

export default function App() {
  // Boot & System Lifecycle State
  const [isBooting, setIsBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  // Navigation & Workspace State
  const [currentSection, setCurrentSection] = useState<MainNavSection>('dashboard');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceSubTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Entities State
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [audienceInsights, setAudienceInsights] = useState<AudienceInsight[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // AI & Async State
  const [profileDiagnostic, setProfileDiagnostic] = useState<ProfileDiagnosticResult | null>(null);
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isAnalyzing = false;
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState(false);
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);

  // Modal Controls
  const [clientFormModalOpen, setClientFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  /** Demo e produção nunca se misturam: cada modo enxerga apenas os próprios clientes. */
  const visibleClients = useCallback((): Client[] => {
    const demoId = DemoProvider.getDemoClientId();
    const all = storageService.clients.getAll();
    return storageService.isDemoLoaded() ? all.filter((c) => c.id === demoId) : all.filter((c) => c.id !== demoId);
  }, []);

  // Load Client Domain Data
  const loadClientData = useCallback((client: Client) => {
    const acc = instagramService.getAccount(client.id);
    setInstagramAccount(acc);

    const clientSnaps = storageService.history.getByClient(client.id);
    setSnapshots(clientSnaps);

    const clientContents = storageService.contents.getByClient(client.id);
    setContents(clientContents);

    const clientComps = storageService.competitors.getByClient(client.id);
    setCompetitors(clientComps);

    const clientAudience = storageService.audience.getByClient(client.id);
    setAudienceInsights(clientAudience);

    const clientIdeas = storageService.ideas.getByClient(client.id);
    setIdeas(clientIdeas);

    const clientCalendar = storageService.calendar.getByClient(client.id);
    setCalendarItems(clientCalendar);

    const clientReports = storageService.reports.getByClient(client.id);
    setReports(clientReports);

    // Rule evaluation
    alertEngine.evaluateClientRules(client, clientSnaps, clientContents, acc);
    setAlerts(alertEngine.getAll());

    // Último diagnóstico salvo (persistido localmente)
    const lastDiagnostic = storageService.aiAnalyses.getByClient(client.id).find((a) => a.analysisType === 'PROFILE_DIAGNOSTIC');
    const savedDiagnostic = lastDiagnostic ? ProfileDiagnosticResponseSchema.safeParse(lastDiagnostic.output) : null;
    setProfileDiagnostic(
      savedDiagnostic?.success
        ? { ...savedDiagnostic.data, analyzedAt: lastDiagnostic?.createdAt, model: lastDiagnostic?.model }
        : null
    );

    // Próximas ações: do último diagnóstico ou regras determinísticas
    const actions = savedDiagnostic?.success && savedDiagnostic.data.nextActions.length > 0
      ? savedDiagnostic.data.nextActions
      : aiService.generateNextActions(client, clientContents, clientSnaps);
    setNextActions(actions);
  }, []);

  // Reload all agency data
  const reloadAllData = useCallback(() => {
    const allClients = visibleClients();
    setClients(allClients);

    const isDemo = storageService.isDemoLoaded();
    setIsDemoLoaded(isDemo);

    const allAlerts = alertEngine.getAll();
    setAlerts(allAlerts);

    if (allClients.length > 0) {
      setActiveClient(prev => {
        const found = prev ? allClients.find(c => c.id === prev.id) : allClients[0];
        const next = found || allClients[0];
        loadClientData(next);
        return next;
      });
    } else {
      setActiveClient(null);
    }
  }, [loadClientData, visibleClients]);

  /** Sincroniza o cadastro local de clientes com o servidor (necessário para OAuth, sync e IA). */
  const syncClientsWithServer = useCallback(async () => {
    const demoId = DemoProvider.getDemoClientId();
    const local = storageService.clients.getAll().filter((c) => c.id !== demoId);
    await Promise.allSettled(local.map((c) => sessionService.registerClient(c)));
    try {
      const remote = await sessionService.listClients();
      const localIds = new Set(local.map((c) => c.id));
      remote
        .filter((r) => !localIds.has(r.id))
        .forEach((r) => {
          const p = r.profile as Partial<Client>;
          storageService.clients.create({
            id: r.id,
            name: r.name,
            company: p.company ?? '',
            instagram: r.instagramHandle || p.instagram || '@',
            website: '',
            whatsapp: '',
            city: '',
            segment: r.segment || p.segment || 'Não informado',
            subsegment: p.subsegment ?? '',
            targetAudience: p.targetAudience ?? '',
            persona: p.persona ?? '',
            averageTicket: p.averageTicket ?? '',
            products: '',
            services: '',
            objectives: p.objectives ?? [],
            pillars: p.pillars ?? [],
            formats: p.formats ?? ['Reels', 'Carrossel'],
            toneOfVoice: p.toneOfVoice ?? '',
            differentiators: p.differentiators ?? '',
            notes: '',
            status: 'active',
            onboardingStep: 1,
            healthStatus: 'not_connected'
          });
        });
    } catch (err) {
      logger.warn('Falha ao listar clientes do servidor', { error: describeApiError(err) });
    }
  }, []);

  /** Trata o retorno do OAuth (?instagram=connected|error&clientId=...&reason=...). */
  const handleOAuthReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('instagram');
    if (!outcome) return;
    const clientId = params.get('clientId');
    const reason = params.get('reason');
    window.history.replaceState({}, '', window.location.pathname);

    const client = clientId ? storageService.clients.getById(clientId) : undefined;
    if (client) {
      setActiveClient(client);
      setCurrentSection('performance');
      setWorkspaceTab('instagram');
    }
    if (outcome === 'connected' && clientId) {
      await instagramService.checkStatus(clientId);
      notificationStore.notify('Instagram conectado', 'Autorização concluída. Iniciando a primeira sincronização.', 'success');
      const res = await instagramService.syncNow(clientId, 'AUTO_OPEN');
      if (!res.success && res.error) notificationService.showToast(res.error, 'warning');
    } else {
      const messages: Record<string, string> = {
        ACCESS_DENIED: 'A autorização foi cancelada na Meta.',
        STATE_EXPIRED: 'O link de autorização expirou. Tente conectar novamente.',
        STATE_ALREADY_USED: 'Este retorno de autorização já foi utilizado.',
        STATE_NOT_FOUND: 'Retorno de autorização inválido. Inicie a conexão novamente.',
        STATE_MISSING: 'Retorno de autorização inválido. Inicie a conexão novamente.',
        NO_BUSINESS_ACCOUNT: 'Nenhuma conta profissional do Instagram vinculada a uma Página foi encontrada.',
        TOKEN_EXCHANGE_FAILED: 'A Meta recusou a troca do código de autorização. Tente novamente.',
        META_NOT_CONFIGURED: 'Instagram API não configurada no servidor.'
      };
      if (clientId) await instagramService.checkStatus(clientId);
      notificationService.showToast(messages[reason ?? ''] ?? 'Não foi possível concluir a conexão com o Instagram.', 'error');
    }
    if (client) loadClientData(client);
  }, [loadClientData]);

  // Safe Application Initialization
  const initializeApplication = useCallback(async () => {
    setIsBooting(true);
    setBootError(null);
    try {
      logger.info('Starting system boot sequence...');
      
      // Step 1: Run storage migrations
      migrationEngine.runMigrations();

      // Step 2: remove o cliente demo legado (versões anteriores) para não contaminar produção.
      if (storageService.clients.getById('client-ravi-demo')) storageService.deleteClientCascade('client-ravi-demo');

      // Step 3: estado do backend + sessão (modo demo não depende do servidor).
      const isDemo = storageService.isDemoLoaded();
      setIsDemoLoaded(isDemo);
      const [status, session] = await Promise.all([
        sessionService.getStatus(),
        sessionService.getSession().catch(() => ({ authenticated: false, user: null, configured: false }))
      ]);
      setBackendStatus(status);
      setSessionUser(session.user);

      if (session.user && !isDemo) {
        await syncClientsWithServer();
      }

      // Step 4: clientes visíveis no modo atual
      const existingClients = visibleClients();
      setClients(existingClients);
      setAlerts(alertEngine.getAll());

      if (existingClients.length > 0) {
        const initial = existingClients[0];
        setActiveClient(initial);
        loadClientData(initial);
      } else {
        setActiveClient(null);
      }

      logger.info('System boot completed successfully.');
      setIsBooting(false);
    } catch (err: any) {
      logger.error('System boot failed', { error: err.message });
      setBootError(err.message || 'Falha na inicialização do sistema');
      setIsBooting(false);
    }
  }, [loadClientData, visibleClients, syncClientsWithServer]);

  // Retorno do OAuth tratado após o boot, com a interface (e os toasts) já montada.
  useEffect(() => {
    if (!isBooting && sessionUser && !isDemoLoaded) void handleOAuthReturn();
  }, [isBooting, sessionUser, isDemoLoaded, handleOAuthReturn]);

  useEffect(() => {
    initializeApplication();
  }, [initializeApplication]);

  // Handle client selection
  const handleSelectClient = (client: Client | null) => {
    setActiveClient(client);
    if (client) {
      loadClientData(client);
      setWorkspaceTab('overview');
    }
  };

  // Sync Instagram handler
  const handleSyncActiveClient = async () => {
    if (!activeClient) return;
    setIsSyncing(true);
    try {
      const res = await instagramService.syncNow(activeClient.id);
      if (res.success) {
        notificationStore.notify(
          'Sincronização Concluída',
          `Dados atualizados para ${activeClient.name}. Snapshot registrado com sucesso.`,
          'success'
        );
        loadClientData(activeClient);
      } else {
        notificationStore.notify(
          'Falha na Sincronização',
          res.error || 'Não foi possível conectar com a API Meta.',
          'error'
        );
      }
    } catch {
      notificationService.showToast('Erro inesperado na sincronização.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Profile Analysis handler
  // IA manual: abre o modal com o prompt completo do cliente.
  const handleAnalyzeProfile = () => {
    if (!activeClient) return;
    setDiagnosticModalOpen(true);
  };

  const diagnosticPrompt = activeClient && diagnosticModalOpen
    ? buildDiagnosticPrompt({
        client: activeClient,
        contents,
        snapshots,
        competitors,
        audienceInsights
      })
    : '';

  const handleImportDiagnostic = (response: string) => {
    if (!activeClient) return;
    const parsed = parseDiagnosticResponse(response);
    const diagnostic: ProfileDiagnosticResult = { ...parsed, analyzedAt: new Date().toISOString(), model: 'IA externa (prompt manual)' };
    storageService.aiAnalyses.create({
      clientId: activeClient.id,
      analysisType: 'PROFILE_DIAGNOSTIC',
      model: 'IA externa (prompt manual)',
      promptVersion: 'MANUAL_DIAGNOSTIC_V1',
      inputDataHash: `contents:${contents.length}`,
      output: diagnostic,
      confidence: 'MEDIUM',
      sourceDataIds: contents.map((c) => c.id).slice(0, 10)
    });
    setProfileDiagnostic(diagnostic);
    if (diagnostic.nextActions.length > 0) setNextActions(diagnostic.nextActions);
    setDiagnosticModalOpen(false);
    setWorkspaceTab('diagnostic');
    notificationStore.notify('Diagnóstico importado', `Análise salva para ${activeClient.name}.`, 'success');
  };

  // Client CRUD Handlers
  const registerOnServer = (client: Client) => {
    if (isDemoLoaded || !sessionUser) return;
    sessionService.registerClient(client).catch((err) => {
      notificationService.showToast(`Cliente salvo localmente, mas não foi registrado no servidor: ${describeApiError(err)}`, 'warning');
    });
  };

  const handleSaveClient = (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingClient) {
      const updated = storageService.clients.update(editingClient.id, data);
      if (updated) {
        registerOnServer(updated);
        notificationService.showToast(`Cliente ${data.name} atualizado.`, 'success');
        setEditingClient(null);
      }
    } else {
      const created = storageService.clients.create(data);
      registerOnServer(created);
      notificationStore.notify(
        'Novo Cliente Cadastrado',
        `Workspace criado para ${created.name} (${created.instagram}).`,
        'success'
      );
      setActiveClient(created);
      loadClientData(created);
    }
    setClientFormModalOpen(false);
    reloadAllData();
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${client.name}? Todos os dados associados serão removidos.`)) {
      storageService.clients.delete(client.id);
      if (!isDemoLoaded && sessionUser) {
        sessionService.removeClient(client.id).catch((err) =>
          notificationService.showToast(`Removido localmente; falha ao remover no servidor: ${describeApiError(err)}`, 'warning')
        );
      }
      notificationService.showToast(`Cliente ${client.name} excluído.`, 'warning');
      setActiveClient(null);
      reloadAllData();
    }
  };

  // Demo Mode Switch
  const handleToggleDemoData = () => {
    if (isDemoLoaded) {
      if (window.confirm('Deseja desativar o modo demonstração e retornar à base de produção limpa?')) {
        storageService.clearDemoData();
        setIsDemoLoaded(false);
        notificationService.showToast('Modo demonstração encerrado.', 'info');
        reloadAllData();
      }
    } else {
      storageService.seedDemoData();
      setIsDemoLoaded(true);
      notificationService.showToast('Modo demonstração ativado com dados fictícios.', 'success');
      reloadAllData();
    }
  };

  // Navigation title mapper
  const getSectionTitle = () => {
    if (activeClient) {
      return activeClient.name;
    }
    const titles: Record<MainNavSection, string> = {
      dashboard: 'Dashboard da Agência',
      clients: 'Carteira de Clientes',
      performance: 'Performance Geral',
      competitors: 'Concorrentes Mapeados',
      research: 'Pesquisa de Público',
      ideas: 'Banco de Ideias',
      calendar: 'Calendário Editorial',
      reports: 'Relatórios Executivos',
      alerts: 'Central de Alertas',
      settings: 'Configurações'
    };
    return titles[currentSection] || 'Social Intelligence';
  };

  const unreadAlertsCount = alerts.filter(a => a.status === 'NEW').length;

  if (isBooting || bootError) {
    return <BootLoader error={bootError} onRetry={initializeApplication} />;
  }

  if (!sessionUser && !isDemoLoaded) {
    return (
      <>
        <LoginScreen
          status={backendStatus}
          onLogin={async (email, password) => {
            try {
              await sessionService.login(email, password);
            } catch (err) {
              throw new Error(describeApiError(err, 'Não foi possível entrar.'));
            }
            await initializeApplication();
          }}
          onExploreDemo={() => {
            storageService.seedDemoData();
            setIsDemoLoaded(true);
            reloadAllData();
          }}
        />
        <ToastContainer />
      </>
    );
  }

  const handleLogout = async () => {
    try {
      await sessionService.logout();
    } finally {
      setSessionUser(null);
      setActiveClient(null);
      setClients([]);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-neutral-950">
      {/* Demo Banner */}
      {isDemoLoaded && (
        <DemoBanner onExitDemo={handleToggleDemoData} />
      )}

      <div className="flex-1 flex min-w-0">
        {/* Fixed Left Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onNavigate={(sec) => {
            setMobileMenuOpen(false);
            if (sec === 'settings') {
              setSettingsModalOpen(true);
              return;
            }
            if (sec === 'alerts') {
              setAlertsModalOpen(true);
              return;
            }
            setCurrentSection(sec);
            // Cada item do menu abre a aba correspondente do cliente ativo.
            const tab = SECTION_TO_TAB[sec];
            if (tab) {
              setWorkspaceTab(tab);
              if (!activeClient && clients.length > 0) {
                setActiveClient(clients[0]);
                loadClientData(clients[0]);
              }
            }
          }}
          clients={clients}
          activeClient={activeClient}
          onSelectClient={handleSelectClient}
          unreadAlertsCount={unreadAlertsCount}
          isDemoLoaded={isDemoLoaded}
          onToggleDemoData={handleToggleDemoData}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          userName={sessionUser?.name ?? null}
          userRole={sessionUser?.role ?? null}
          onLogout={sessionUser ? handleLogout : undefined}
        />

        {/* Main App Container */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          {/* Top Bar Header */}
          <Header
            activeClient={activeClient}
            clients={clients}
            currentSectionTitle={getSectionTitle()}
            onOpenSearch={() => setGlobalSearchOpen(true)}
            onOpenNewClient={() => {
              setEditingClient(null);
              setClientFormModalOpen(true);
            }}
            onSyncCurrentClient={activeClient && instagramAccount?.isConnected ? handleSyncActiveClient : undefined}
            isSyncing={isSyncing}
            unreadAlertsCount={unreadAlertsCount}
            onOpenAlerts={() => setAlertsModalOpen(true)}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            onSelectClient={handleSelectClient}
          />

          {/* Dynamic Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <ErrorBoundary>
              {/* Workspace Tab View */}
              {!activeClient && SECTION_TO_TAB[currentSection] ? (
                <div className="max-w-lg mx-auto mt-16 text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 space-y-4">
                  <h2 className="text-lg font-semibold text-neutral-100">Cadastre um cliente primeiro</h2>
                  <p className="text-sm text-neutral-400">
                    {getSectionTitle()} funciona dentro do workspace de cada cliente. Cadastre o primeiro cliente para começar.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => {
                        setEditingClient(null);
                        setClientFormModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold"
                    >
                      Cadastrar cliente
                    </button>
                    <button
                      onClick={() => setCurrentSection('dashboard')}
                      className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm"
                    >
                      Voltar ao painel
                    </button>
                  </div>
                </div>
              ) : activeClient && currentSection !== 'dashboard' && currentSection !== 'clients' ? (
                <div>
                  <WorkspaceHeader
                    client={activeClient}
                    account={instagramAccount}
                    activeTab={workspaceTab}
                    onTabChange={(tab) => {
                      setWorkspaceTab(tab);
                      const section = (Object.keys(SECTION_TO_TAB) as MainNavSection[]).find((k) => SECTION_TO_TAB[k] === tab);
                      setCurrentSection(section ?? 'performance');
                    }}
                    onBackToClients={() => {
                      setActiveClient(null);
                      setCurrentSection('dashboard');
                    }}
                    onSync={handleSyncActiveClient}
                    isSyncing={isSyncing}
                    onAnalyzeProfile={handleAnalyzeProfile}
                    isAnalyzing={isAnalyzing}
                  />

                  {/* Subtab Views */}
                  {workspaceTab === 'overview' && (
                    <ClientOverviewTab
                      client={activeClient}
                      snapshots={snapshots}
                      contents={contents}
                      alerts={alerts.filter(a => a.clientId === activeClient.id)}
                      onNavigateTab={setWorkspaceTab}
                      nextActions={nextActions}
                    />
                  )}

                  {workspaceTab === 'metrics' && (
                    <MetricsTab
                      client={activeClient}
                      contents={contents}
                      snapshots={snapshots}
                      hasDiagnostic={profileDiagnostic !== null}
                      ideasCount={ideas.length}
                      calendarCount={calendarItems.length}
                      onRefresh={() => loadClientData(activeClient)}
                      onNavigateTab={setWorkspaceTab}
                    />
                  )}

                  {workspaceTab === 'instagram' && instagramAccount && (
                    <InstagramConnectTab
                      client={activeClient}
                      account={instagramAccount}
                      onRefreshAccount={() => loadClientData(activeClient)}
                      onSync={handleSyncActiveClient}
                      isSyncing={isSyncing}
                    />
                  )}

                  {workspaceTab === 'diagnostic' && (
                    <DiagnosticTab
                      client={activeClient}
                      contents={contents}
                      snapshots={snapshots}
                      diagnostic={profileDiagnostic}
                      onRunDiagnostic={handleAnalyzeProfile}
                      isAnalyzing={isAnalyzing}
                    />
                  )}

                  {workspaceTab === 'performance' && (
                    <PerformanceTab
                      client={activeClient}
                      contents={contents}
                      snapshots={snapshots}
                    />
                  )}

                  {workspaceTab === 'content' && (
                    <ContentTab
                      client={activeClient}
                      contents={contents}
                    />
                  )}

                  {workspaceTab === 'competitors' && (
                    <CompetitorTab
                      client={activeClient}
                      competitors={competitors}
                      onRefresh={() => loadClientData(activeClient)}
                    />
                  )}

                  {workspaceTab === 'research' && (
                    <AudienceTab
                      client={activeClient}
                      insights={audienceInsights}
                      onRefresh={() => loadClientData(activeClient)}
                    />
                  )}

                  {workspaceTab === 'ideas' && (
                    <IdeasTab
                      client={activeClient}
                      ideas={ideas}
                      contents={contents}
                      onRefresh={() => loadClientData(activeClient)}
                    />
                  )}

                  {workspaceTab === 'calendar' && (
                    <CalendarTab
                      client={activeClient}
                      calendarItems={calendarItems}
                      onRefresh={() => loadClientData(activeClient)}
                    />
                  )}

                  {workspaceTab === 'reports' && (
                    <ReportsTab
                      client={activeClient}
                      contents={contents}
                      snapshots={snapshots}
                      reports={reports}
                      onRefresh={() => loadClientData(activeClient)}
                    />
                  )}

                  {workspaceTab === 'history' && (
                    <HistoryTab
                      client={activeClient}
                      snapshots={snapshots}
                    />
                  )}
                </div>
              ) : (
                /* Agency Dashboard / All Clients */
                <AgencyDashboardView
                  clients={clients}
                  snapshots={storageService.history.getAll()}
                  alerts={alerts}
                  onOpenWorkspace={(client) => {
                    setActiveClient(client);
                    loadClientData(client);
                    setCurrentSection('performance');
                    setWorkspaceTab('overview');
                  }}
                  onOpenNewClient={() => {
                    setEditingClient(null);
                    setClientFormModalOpen(true);
                  }}
                  onEditClient={(client) => {
                    setEditingClient(client);
                    setClientFormModalOpen(true);
                  }}
                  onDuplicateClient={(client) => {
                    const dup = storageService.clients.create({
                      ...client,
                      name: `${client.name} (Cópia)`,
                      instagram: `${client.instagram}_copy`
                    });
                    notificationService.showToast(`Cliente duplicado como "${dup.name}".`, 'info');
                    reloadAllData();
                  }}
                  onDeleteClient={handleDeleteClient}
                  onOpenAlerts={() => setAlertsModalOpen(true)}
                  onSeedDemoData={() => {
                    storageService.seedDemoData();
                    setIsDemoLoaded(true);
                    reloadAllData();
                  }}
                />
              )}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <ClientFormModal
        isOpen={clientFormModalOpen}
        onClose={() => {
          setClientFormModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        initialData={editingClient}
      />

      <GlobalSearchModal
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        clients={clients}
        contents={storageService.contents.getAll()}
        ideas={storageService.ideas.getAll()}
        competitors={storageService.competitors.getAll()}
        reports={storageService.reports.getAll()}
        onSelectClient={(client) => {
          setActiveClient(client);
          loadClientData(client);
        }}
        onNavigateSection={(sec) => {
          setWorkspaceTab(sec);
        }}
      />

      <AlertsCenterModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        alerts={alerts}
        clients={clients}
        onRefresh={reloadAllData}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onResetAllData={() => {
          storageService.clearDemoData();
          reloadAllData();
          setSettingsModalOpen(false);
        }}
        onSeedDemoData={() => {
          storageService.seedDemoData();
          reloadAllData();
          setSettingsModalOpen(false);
        }}
        isDemoLoaded={isDemoLoaded}
      />

      <ManualAiModal
        isOpen={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
        title={`Análise completa: ${activeClient?.name ?? ''}`}
        prompt={diagnosticPrompt}
        onImport={handleImportDiagnostic}
        importLabel="Importar diagnóstico"
      />

      {/* Persistent Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
