import React, { useRef, useState } from 'react';
import { backupStats, daysSinceBackup, downloadBackup, parseBackup, restoreBackup } from '../../services/backupService';
import { AppSettings } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  CheckCircle2,
  Download,
  Upload
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllData: () => void;
  onSeedDemoData: () => void;
  isDemoLoaded: boolean;
  /** Chamado depois de restaurar um backup (recarregar a interface). */
  onRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetAllData,
  onSeedDemoData,
  isDemoLoaded,
  onRestored
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupDays, setBackupDays] = useState<number | null>(() => daysSinceBackup());

  const handleDownload = () => {
    const file = downloadBackup();
    setBackupDays(0);
    notificationService.showToast(`Backup baixado (${backupStats(file).total} registros).`, 'success');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const file = parseBackup(await f.text());
      const { total } = backupStats(file);
      const when = new Date(file.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
      if (!window.confirm(`Restaurar o backup de ${when} (${total} registros)? Os dados atuais deste navegador serão substituídos.`)) return;
      restoreBackup(file);
      notificationService.showToast('Backup restaurado.', 'success');
      onRestored?.();
      onClose();
    } catch (err) {
      notificationService.showToast(err instanceof Error ? err.message : 'Não foi possível ler o backup.', 'error');
    }
  };
  const [settings, setSettings] = useState<AppSettings>(storageService.settings.get());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.settings.update(settings);
    notificationService.showToast('Configurações salvas.', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da Agência"
      subtitle="Parâmetros globais do sistema Gabriel Speratti Social Intelligence"
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-5 text-xs font-mono">
        {/* Identificação da Agência */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            01. Identidade da Agência
          </div>

          <div>
            <label htmlFor="settings-agency" className="block text-neutral-400 mb-1">Nome da Agência</label>
            <input
              id="settings-agency"
              type="text"
              value={settings.agencyName}
              onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100 font-bold"
            />
          </div>

          <div>
            <label htmlFor="settings-owner" className="block text-neutral-400 mb-1">Estrategista Responsável</label>
            <input
              id="settings-owner"
              type="text"
              value={settings.ownerName}
              onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100 font-bold"
            />
          </div>
        </div>

        {/* Integrações & Arquitetura */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            02. Status das Integrações
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-medium">Motor de Inteligência Artificial</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Servidor Ativo (Gemini 3.8 Flash)
              </span>
            </div>
            <div className="text-[11px] text-neutral-500 font-sans">
              Proxy server-side com schemas estruturados e fallback analítico especialista.
            </div>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-medium">Persistência de Dados</span>
              <span className="text-amber-400">Repository Layer (LocalStorage / Supabase Ready)</span>
            </div>
            <div className="text-[11px] text-neutral-500 font-sans">
              Desacoplada para permitir migração instantânea para Cloud SQL / PostgreSQL sem refatorar componentes.
            </div>
          </div>
        </div>

        {/* Gerenciamento de Dados & Demo */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            03. Dados de Demonstração e Reset
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div>
              <div className="text-neutral-200 font-semibold">Cliente de demonstração (Clínica Aurora)</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {isDemoLoaded ? 'Dados fictícios de demonstração ativos' : 'Carregar base completa de demonstração'}
              </div>
            </div>

            {isDemoLoaded ? (
              <button
                type="button"
                onClick={onResetAllData}
                className="px-3 py-1.5 bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-900/50 rounded transition-colors text-[11px]"
              >
                Limpar Demo
              </button>
            ) : (
              <button
                type="button"
                onClick={onSeedDemoData}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded transition-colors text-[11px]"
              >
                Ativar demonstração
              </button>
            )}
          </div>
        </div>

        {/* Backup */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            04. Backup dos dados
          </div>
          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
            Posts importados, métricas, ideias, calendário, tarefas, diagnósticos e relatórios ficam salvos neste navegador.
            Baixe um backup toda semana para não perder nada se o navegador for limpo ou se trocar de computador.
          </p>
          <div className="flex flex-wrap items-center gap-2 font-sans">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar backup
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              <Upload className="h-3.5 w-3.5" />
              Restaurar backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Arquivo de backup" onChange={handleRestore} />
            <span className="text-[11px] text-neutral-500">
              {backupDays === null ? 'Nenhum backup feito neste navegador.' : backupDays === 0 ? 'Último backup: hoje.' : `Último backup: há ${backupDays} dia${backupDays > 1 ? 's' : ''}.`}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700"
          >
            Fechar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded hover:bg-amber-400"
          >
            Salvar Configurações
          </button>
        </div>
      </form>
    </Modal>
  );
};
