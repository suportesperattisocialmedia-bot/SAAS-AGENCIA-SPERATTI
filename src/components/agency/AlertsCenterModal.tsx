import { ALERT_STATUS_LABELS } from '../../utils/labels';
import { formatDateBR } from '../../utils/dates';
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Alert, Client, AlertSeverity} from '../../types';
import { storageService } from '../../services/storageService';
import { alertEngine } from '../../services/alerts/alertEngine';
import {
  CheckCircle2,
  Trash2} from 'lucide-react';

interface AlertsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  clients: Client[];
  onRefresh: () => void;
}

export const AlertsCenterModal: React.FC<AlertsCenterModalProps> = ({
  isOpen,
  onClose,
  alerts,
  clients,
  onRefresh
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'resolved'>('all');

  const filteredAlerts = alerts.filter(a => {
    if (filterStatus === 'new') return a.status === 'NEW' || a.status === 'READ';
    if (filterStatus === 'resolved') return a.status === 'RESOLVED';
    return true;
  });

  const handleResolve = (id: string) => {
    alertEngine.updateStatus(id, 'RESOLVED');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    storageService.alerts.delete(id);
    onRefresh();
  };

  const getSeverityStyle = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'border-rose-500/30 bg-rose-950/20 text-rose-400';
      case 'high':
        return 'border-orange-500/30 bg-orange-950/20 text-orange-400';
      case 'medium':
        return 'border-amber-500/30 bg-amber-950/20 text-amber-400';
      case 'low':
        return 'border-sky-500/30 bg-sky-950/20 text-sky-400';
      default:
        return 'border-neutral-500/30 bg-[#161618] text-neutral-300';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Central de Alertas Estratégicos e Operacionais"
      subtitle="Monitoramento em tempo real de anomalias, picos e oportunidades"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3 tabular-nums text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-2xl transition-colors ${
                filterStatus === 'all'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Todos ({alerts.length})
            </button>
            <button
              onClick={() => setFilterStatus('new')}
              className={`px-2.5 py-1 rounded-2xl transition-colors ${
                filterStatus === 'new'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Ativos ({alerts.filter(a => a.status !== 'RESOLVED').length})
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`px-2.5 py-1 rounded-2xl transition-colors ${
                filterStatus === 'resolved'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Resolvidos ({alerts.filter(a => a.status === 'RESOLVED').length})
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {filteredAlerts.map(alert => {
            const client = clients.find(c => c.id === alert.clientId);

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 transition-colors ${getSeverityStyle(alert.severity)}`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] tabular-nums mb-1">
                    <span className="font-bold">{alert.type.replace('_', ' ')}</span>
                    <span className="text-neutral-400">{formatDateBR(alert.createdAt)}</span>
                  </div>

                  <h5 className="text-xs font-bold text-neutral-100">
                    {alert.title}
                  </h5>

                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    {alert.message}
                  </p>

                  {client && (
                    <div className="mt-2 text-[11px] tabular-nums text-neutral-400">
                      Cliente: <span className="text-amber-300">{client.name}</span> ({client.instagram})
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-xs tabular-nums">
                  <span className="text-[11px] text-neutral-500">
                    Status: {ALERT_STATUS_LABELS[alert.status]}
                  </span>

                  <div className="flex items-center gap-2">
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Excluir alerta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500 tabular-nums">
              Nenhum alerta registrado nesta categoria.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
