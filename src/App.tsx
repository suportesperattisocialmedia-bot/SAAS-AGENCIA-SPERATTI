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
  MetricSnapshot,
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
import { notificationService } from './services/notificationService';

// Layout Components
import { Sidebar, MainNavSection } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';

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
import { DiagnosticTab } from './components/workspace/DiagnosticTab';
import { PerformanceTab } from './components/workspace/PerformanceTab';
import { ContentTab } from './components/workspace/ContentTab';
import { CompetitorTab } from './components/workspace/CompetitorTab';
import { AudienceTab } from './components/workspace/AudienceTab';
import { IdeasTab } from './components/workspace/IdeasTab';
import { CalendarTab } from './components/workspace/CalendarTab';
import { ReportsTab } from './components/workspace/ReportsTab';
import { HistoryTab } from './components/workspace/HistoryTab';

export default function App() {
  // Navigation & Workspace State
  const [currentSection, setCurrentSection] = useState<MainNavSection>('dashboard');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceSubTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Entities State
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([]);
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);

  // Modal Controls
  const [clientFormModalOpen, setClientFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Load or Seed Initial State
  const reloadAllData = useCallback(() => {
    const allClients = storageService.clients.getAll();
    setClients(allClients);

    const isDemo = storageService.isDemoLoaded();
    setIsDemoLoaded(isDemo);

    const allAlerts = storageService.alerts.getAll();
    setAlerts(allAlerts);

    // Pick active client
    if (allClients.length > 0) {
      const current = activeClient
        ? allClients.find(c => c.id === activeClient.id) || allClients[0]
        : allClients[0];
      setActiveClient(current);
      loadClientData(current);
    } else {
      setActiveClient(null);
    }
  }, [activeClient]);

  const loadClientData = (client: Client) => {
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

    // Generate initial actions
    const actions = aiService.generateNextActions(client, clientContents, clientSnaps);
    setNextActions(actions);
  };

  useEffect(() => {
    // Clear all previous data so the user starts completely from scratch
    storageService.clearAllData();
    reloadAllData();
    notificationService.showToast('Sistema limpo. Pronto para cadastrar do zero!', 'info');
  }, []);

  // Update client data when activeClient changes
  const handleSelectClient = (client: Client | null) => {
    setActiveClient(client);
    if (client) {
      loadClientData(client);
      setWorkspaceTab('overview');
    }
  };

  // Sync handler
  const handleSyncActiveClient = async () => {
    if (!activeClient) return;
    setIsSyncing(true);
    try {
      const res = await instagramService.syncNow(activeClient.id);
      if (res.success) {
        notificationService.addNotification(
          'Sincronização Concluída',
          `Dados atualizados para ${activeClient.name}. Snapshot diário registrado.`,
          'success'
        );
        loadClientData(activeClient);
      } else {
        notificationService.addNotification(
          'Falha na Sincronização',
          res.error || 'Erro desconhecido ao conectar com a API Meta.',
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
  const handleAnalyzeProfile = async () => {
    if (!activeClient) return;
    setIsAnalyzing(true);
    try {
      const diag = await aiService.analyzeProfile(activeClient, contents, snapshots);
      setProfileDiagnostic(diag);
      setNextActions(diag.nextActions || nextActions);
      notificationService.addNotification(
        'Diagnóstico Gerado',
        `Auditoria estratégica concluída para ${activeClient.name}.`,
        'success'
      );
      setWorkspaceTab('diagnostic');
    } catch {
      notificationService.showToast('Erro ao realizar diagnóstico.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Client CRUD Handlers
  const handleSaveClient = (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingClient) {
      const updated = storageService.clients.update(editingClient.id, data);
      notificationService.showToast(`Cliente ${data.name} atualizado.`, 'success');
      setEditingClient(null);
    } else {
      const created = storageService.clients.create(data);
      notificationService.addNotification(
        'Novo Cliente Cadastrado',
        `Workspace criado para ${created.name} (${created.instagram}).`,
        'success'
      );
      setActiveClient(created);
      loadClientData(created);
    }
    reloadAllData();
  };

  const handleDuplicateClient = (client: Client) => {
    const dup = storageService.clients.duplicate(client.id);
    if (dup) {
      notificationService.showToast(`Cliente duplicado como "${dup.name}".`, 'info');
      reloadAllData();
    }
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${client.name}? Todos os conteúdos e históricos associados serão removidos.`)) {
      storageService.clients.delete(client.id);
      notificationService.showToast(`Cliente ${client.name} excluído.`, 'warning');
      setActiveClient(null);
      reloadAllData();
    }
  };

  // Demo toggle
  const handleToggleDemoData = () => {
    if (isDemoLoaded) {
      if (window.confirm('Deseja limpar os dados de demonstração do Dr. Ravi Alencar?')) {
        storageService.clearDemoData();
        notificationService.showToast('Dados de demonstração removidos.', 'info');
        reloadAllData();
      }
    } else {
      storageService.seedDemoData();
      notificationService.showToast('Base de demonstração do Dr. Ravi Alencar carregada!', 'success');
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

  const unreadAlertsCount = alerts.filter(a => a.status === 'new').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans antialiased selection:bg-amber-500 selection:text-neutral-950">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={(sec) => {
          if (sec === 'settings') {
            setSettingsModalOpen(true);
          } else if (sec === 'alerts') {
            setAlertsModalOpen(true);
          } else {
            setCurrentSection(sec);
            // If navigating to workspace-specific sections without active client, pick first
            if (!activeClient && clients.length > 0 && sec !== 'dashboard' && sec !== 'clients') {
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
          onSyncCurrentClient={activeClient ? handleSyncActiveClient : undefined}
          isSyncing={isSyncing}
          unreadAlertsCount={unreadAlertsCount}
          onOpenAlerts={() => setAlertsModalOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onSelectClient={handleSelectClient}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* If an active client workspace is open and user isn't on agency dashboard */}
          {activeClient && currentSection !== 'dashboard' && currentSection !== 'clients' ? (
            <div>
              {/* Workspace Navigation Subheader */}
              <WorkspaceHeader
                client={activeClient}
                account={instagramAccount}
                activeTab={workspaceTab}
                onTabChange={setWorkspaceTab}
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
            /* Agency-wide Views (Dashboard & Clients) */
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
              onDuplicateClient={handleDuplicateClient}
              onDeleteClient={handleDeleteClient}
              onOpenAlerts={() => setAlertsModalOpen(true)}
            />
          )}
        </main>
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

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
