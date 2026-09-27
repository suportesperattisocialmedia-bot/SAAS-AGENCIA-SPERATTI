import React from 'react';
import type { Client } from '../../types';
import { storageService } from '../../services/storageService';
import { AdminOverview, type AdminSection } from './AdminOverview';
import { InvoicesView } from './InvoicesView';
import { ContractsView } from './ContractsView';
import { ProjectsView } from './ProjectsView';
import { ExpensesView } from './ExpensesView';
import { useFinance } from './useFinance';

export type { AdminSection };

/** Modo Administração: financeiro, contratos, produção e despesas da agência. */
export const AdminView: React.FC<{ section: AdminSection; onNavigate: (s: AdminSection) => void; clients: Client[]; agencyName: string }> = ({
  section,
  onNavigate,
  clients,
  agencyName
}) => {
  const fin = useFinance();
  const options = clients.map((c) => ({ id: c.id, name: c.name }));
  switch (section) {
    case 'invoices':
      return <InvoicesView {...fin} clients={options} agencyName={agencyName} />;
    case 'contracts':
      return <ContractsView {...fin} clients={options} />;
    case 'projects':
      return <ProjectsView {...fin} clients={options} />;
    case 'expenses':
      return <ExpensesView {...fin} clients={options} />;
    default:
      return <AdminOverview {...fin} clients={clients} tasks={storageService.tasks.getAll()} onNavigate={onNavigate} />;
  }
};
