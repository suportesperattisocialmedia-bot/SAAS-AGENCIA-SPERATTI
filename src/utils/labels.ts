import type { AlertStatus, PipelineStatus } from '../types';

/** Rótulos legíveis para códigos internos exibidos na interface. */
export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  IDEIA: 'Ideia',
  PLANEJADO: 'Planejado',
  ROTEIRO: 'Roteiro',
  EM_PRODUCAO: 'Em produção',
  EDITANDO: 'Editando',
  APROVACAO: 'Aprovação',
  AGENDADO: 'Agendado',
  PUBLICADO: 'Publicado',
  ANALISADO: 'Analisado'
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  NEW: 'Novo',
  READ: 'Lido',
  RESOLVED: 'Resolvido'
};
