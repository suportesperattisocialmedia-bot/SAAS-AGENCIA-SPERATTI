import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  Settings,
  Database,
  KeyRound,
  Shield,
  CheckCircle2,
  RefreshCw,
  Building,
  HardDrive
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllData: () => void;
  onSeedDemoData: () => void;
  isDemoLoaded: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetAllData,
  onSeedDemoData,
  isDemoLoaded
}) => {
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
            <label className="block text-neutral-400 mb-1">Nome da Agência</label>
            <input
              type="text"
              value={settings.agencyName}
              onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Estrategista Responsável</label>
            <input
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
              <div className="text-neutral-200 font-semibold">Cliente Modelo (Dr. Ravi Alencar)</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {isDemoLoaded ? 'Dados mockados carregados e ativos' : 'Carregar base completa de demonstração'}
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
                Carregar Mock Ravi
              </button>
            )}
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
