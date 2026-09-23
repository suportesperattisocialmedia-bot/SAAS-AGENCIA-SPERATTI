import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Client } from '../../types';
import { Plus, X, Check } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Client | null;
}

const DEFAULT_OBJECTIVES = [
  'Crescimento',
  'Autoridade',
  'Leads',
  'Vendas',
  'Engajamento',
  'Reconhecimento',
  'Posicionamento',
  'Comunidade'
];

const DEFAULT_FORMATS = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Lives'];

const DEFAULT_PILLARS = [
  'Educação',
  'Autoridade',
  'Entretenimento',
  'Prova social',
  'Bastidores',
  'Venda',
  'Conexão'
];

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    instagram: '',
    website: '',
    whatsapp: '',
    city: '',
    segment: '',
    subsegment: '',
    targetAudience: '',
    persona: '',
    averageTicket: '',
    products: '',
    services: '',
    toneOfVoice: '',
    differentiators: '',
    notes: '',
    status: 'active' as Client['status'],
    onboardingStep: 10
  });

  const [objectives, setObjectives] = useState<string[]>(['Autoridade', 'Leads']);
  const [formats, setFormats] = useState<string[]>(['Reels', 'Carrossel']);
  const [pillars, setPillars] = useState<string[]>(['Educação', 'Autoridade']);

  const [customObjective, setCustomObjective] = useState('');
  const [customPillar, setCustomPillar] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        company: initialData.company,
        instagram: initialData.instagram,
        website: initialData.website || '',
        whatsapp: initialData.whatsapp || '',
        city: initialData.city || '',
        segment: initialData.segment || '',
        subsegment: initialData.subsegment || '',
        targetAudience: initialData.targetAudience || '',
        persona: initialData.persona || '',
        averageTicket: initialData.averageTicket || '',
        products: initialData.products || '',
        services: initialData.services || '',
        toneOfVoice: initialData.toneOfVoice || '',
        differentiators: initialData.differentiators || '',
        notes: initialData.notes || '',
        status: initialData.status || 'active',
        onboardingStep: initialData.onboardingStep || 10
      });
      setObjectives(initialData.objectives || []);
      setFormats(initialData.formats || []);
      setPillars(initialData.pillars || []);
    } else {
      // Reset defaults
      setFormData({
        name: '',
        company: '',
        instagram: '',
        website: '',
        whatsapp: '',
        city: '',
        segment: '',
        subsegment: '',
        targetAudience: '',
        persona: '',
        averageTicket: '',
        products: '',
        services: '',
        toneOfVoice: '',
        differentiators: '',
        notes: '',
        status: 'active',
        onboardingStep: 5
      });
      setObjectives(['Autoridade', 'Leads', 'Vendas']);
      setFormats(['Reels', 'Carrossel', 'Stories']);
      setPillars(['Educação', 'Autoridade', 'Prova social']);
    }
  }, [initialData, isOpen]);

  const toggleArrayItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddCustomObjective = () => {
    if (customObjective.trim() && !objectives.includes(customObjective.trim())) {
      setObjectives([...objectives, customObjective.trim()]);
      setCustomObjective('');
    }
  };

  const handleAddCustomPillar = () => {
    if (customPillar.trim() && !pillars.includes(customPillar.trim())) {
      setPillars([...pillars, customPillar.trim()]);
      setCustomPillar('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.instagram.trim()) return;

    onSave({
      ...formData,
      instagram: formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram.trim()}`,
      objectives,
      formats,
      pillars,
      competitors: initialData?.competitors || []
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Editar Cliente: ${initialData.name}` : 'Cadastrar Novo Cliente'}
      subtitle="Dados de inteligência, posicionamento e estratégia da conta"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação Básica */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            01. Identificação e Contato
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Nome do Cliente / Especialista *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Dr. Ravi Alencar"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Empresa / Clínica / Marca *
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Ex: Instituto Ravi de Cirurgia Plástica"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                @ Instagram *
              </label>
              <input
                type="text"
                required
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="Ex: @dr.ravialencar"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono placeholder-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                WhatsApp Comercial
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+55 11 99999-9999"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono placeholder-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Site Oficial
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Cidade / Região
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: São Paulo - SP (Jardins)"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500"
              />
            </div>
          </div>
        </div>

        {/* Mercado, Segmento e Persona */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            02. Mercado, Segmento e Persona
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Segmento Principal
              </label>
              <input
                type="text"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="Ex: Saúde e Alta Performance"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Subsegmento / Nicho Específico
              </label>
              <input
                type="text"
                value={formData.subsegment}
                onChange={(e) => setFormData({ ...formData, subsegment: e.target.value })}
                placeholder="Ex: Cirurgia Plástica Facial & Longevidade"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Ticket Médio de Venda
              </label>
              <input
                type="text"
                value={formData.averageTicket}
                onChange={(e) => setFormData({ ...formData, averageTicket: e.target.value })}
                placeholder="Ex: R$ 38.000,00"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Tom de Comunicação
              </label>
              <input
                type="text"
                value={formData.toneOfVoice}
                onChange={(e) => setFormData({ ...formData, toneOfVoice: e.target.value })}
                placeholder="Ex: Elegante, sóbrio, clínico e empático"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-neutral-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Público-Alvo Demográfico e Comportamental
            </label>
            <textarea
              rows={2}
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              placeholder="Ex: Homens e mulheres de 38 a 60 anos, classe A, focados em rejuvenescimento natural e discrição..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Persona Detalhada
            </label>
            <textarea
              rows={2}
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              placeholder="Ex: Juliana, 44 anos, executiva em SP, teme aspecto esticado, busca segurança clínica absoluta..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-neutral-100"
            />
          </div>
        </div>

        {/* Multi-seletores: Objetivos, Formatos e Pilares */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            03. Estratégia de Conteúdo
          </div>

          {/* Objetivos */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Objetivos Estratégicos (Multi-seleção com Checkbox)
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_OBJECTIVES.map(obj => {
                const isSelected = objectives.includes(obj);
                return (
                  <button
                    type="button"
                    key={obj}
                    onClick={() => toggleArrayItem(objectives, setObjectives, obj)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950' : 'border-neutral-700'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    {obj}
                  </button>
                );
              })}
            </div>
            {/* Custom objective input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="+ Adicionar objetivo personalizado"
                className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-600 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomObjective}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Formatos */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Formatos Prioritários
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_FORMATS.map(fmt => {
                const isSelected = formats.includes(fmt);
                return (
                  <button
                    type="button"
                    key={fmt}
                    onClick={() => toggleArrayItem(formats, setFormats, fmt)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950' : 'border-neutral-700'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pilares */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Pilares de Conteúdo
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PILLARS.map(plr => {
                const isSelected = pillars.includes(plr);
                return (
                  <button
                    type="button"
                    key={plr}
                    onClick={() => toggleArrayItem(pillars, setPillars, plr)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950' : 'border-neutral-700'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    {plr}
                  </button>
                );
              })}
            </div>
            {/* Custom pillar input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customPillar}
                onChange={(e) => setCustomPillar(e.target.value)}
                placeholder="+ Adicionar pilar personalizado"
                className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-600 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomPillar}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Diferenciais e Observações */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase text-amber-400 font-semibold border-b border-neutral-800 pb-1">
            04. Diferenciais Competitivos e Notas
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Diferenciais Únicos
            </label>
            <textarea
              rows={2}
              value={formData.differentiators}
              onChange={(e) => setFormData({ ...formData, differentiators: e.target.value })}
              placeholder="Ex: Pioneiro em Deep Plane sem anestesia traumática, hotel boutique hospitalar..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Observações Estratégicas da Agência
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas confidenciais sobre negociação, ticket ou restrições de imagem..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg p-2.5 text-xs text-neutral-100"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            {initialData ? 'Salvar Alterações' : 'Concluir Cadastro'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
