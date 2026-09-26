import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Client, ContentFormat, HealthStatus } from '../../types';
import { Plus, X, Check, AlertCircle } from 'lucide-react';

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

const VALID_FORMATS: ContentFormat[] = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'];

const DEFAULT_PILLARS = [
  'Educação',
  'Autoridade',
  'Entretenimento',
  'Prova social',
  'Bastidores',
  'Venda',
  'Conexão'
];

const ONBOARDING_STEPS = [
  { step: 1, label: '1. Identificação' },
  { step: 2, label: '2. Estratégia' },
  { step: 3, label: '3. Público' },
  { step: 4, label: '4. Objetivos' },
  { step: 5, label: '5. Conexão Instagram' },
  { step: 6, label: '6. Análise Inicial' },
  { step: 7, label: '7. Concorrentes' },
  { step: 8, label: '8. Pesquisa' },
  { step: 9, label: '9. Ideias' },
  { step: 10, label: '10. Conclusão' }
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
    healthStatus: 'not_connected' as HealthStatus,
    onboardingStep: 1,
    avatarUrl: ''
  });

  const [objectives, setObjectives] = useState<string[]>(['Autoridade', 'Leads']);
  const [formats, setFormats] = useState<ContentFormat[]>(['Reels', 'Carrossel']);
  const [pillars, setPillars] = useState<string[]>(['Educação', 'Autoridade']);

  const [customObjective, setCustomObjective] = useState('');
  const [customPillar, setCustomPillar] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        company: initialData.company || '',
        instagram: initialData.instagram || '',
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
        healthStatus: initialData.healthStatus || 'not_connected',
        onboardingStep: initialData.onboardingStep || 1,
        avatarUrl: initialData.avatarUrl || ''
      });
      setObjectives(initialData.objectives || []);
      setFormats(initialData.formats || ['Reels', 'Carrossel']);
      setPillars(initialData.pillars || []);
      setIsDirty(false);
    } else {
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
        healthStatus: 'not_connected',
        onboardingStep: 1,
        avatarUrl: ''
      });
      setObjectives(['Autoridade', 'Leads']);
      setFormats(['Reels', 'Carrossel']);
      setPillars(['Educação', 'Autoridade']);
      setIsDirty(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleObjective = (item: string) => {
    setIsDirty(true);
    setObjectives(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleFormat = (item: ContentFormat) => {
    setIsDirty(true);
    setFormats(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const togglePillar = (item: string) => {
    setIsDirty(true);
    setPillars(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const addCustomObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (customObjective.trim() && !objectives.includes(customObjective.trim())) {
      setObjectives(prev => [...prev, customObjective.trim()]);
      setCustomObjective('');
      setIsDirty(true);
    }
  };

  const addCustomPillar = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPillar.trim() && !pillars.includes(customPillar.trim())) {
      setPillars(prev => [...prev, customPillar.trim()]);
      setCustomPillar('');
      setIsDirty(true);
    }
  };

  const handleSafeClose = () => {
    if (isDirty) {
      if (window.confirm('Existem alterações não salvas. Deseja realmente fechar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do cliente é obrigatório';
    }

    if (!formData.instagram.trim()) {
      newErrors.instagram = 'Instagram é obrigatório';
    }

    if (!formData.segment.trim()) {
      newErrors.segment = 'Segmento é obrigatório';
    }

    if (formData.website && !formData.website.startsWith('http://') && !formData.website.startsWith('https://')) {
      newErrors.website = 'URL deve começar com https:// ou http://';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Normalize Instagram handle: remove @, spaces, then prefix single @
    const cleanHandle = formData.instagram.replace(/[@\s]/g, '');
    const normalizedInstagram = `@${cleanHandle}`;

    onSave({
      ...formData,
      instagram: normalizedInstagram,
      objectives,
      formats,
      pillars
    });
    setIsDirty(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      title={initialData ? `Editar Cliente: ${initialData.name}` : 'Cadastrar Novo Cliente'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              1. Identificação & Contato
            </h3>
            <span className="text-[10px] text-neutral-500 font-mono">* Campos obrigatórios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Nome do Cliente / Especialista *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Ex: Dr. Roberto Guimarães"
                className={`w-full bg-neutral-950 border ${
                  errors.name ? 'border-rose-500 focus:border-rose-400' : 'border-neutral-800 focus:border-amber-500'
                } rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden`}
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Empresa / Clínica / Marca
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="Ex: Instituto Guimarães de Saúde"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Instagram Oficial *
              </label>
              <input
                type="text"
                value={formData.instagram}
                onChange={e => handleChange('instagram', e.target.value)}
                placeholder="@dr.robertoguimaraes"
                className={`w-full bg-neutral-950 border ${
                  errors.instagram ? 'border-rose-500 focus:border-rose-400' : 'border-neutral-800 focus:border-amber-500'
                } rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden font-mono`}
              />
              {errors.instagram && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.instagram}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                WhatsApp Comercial
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={e => handleChange('whatsapp', e.target.value)}
                placeholder="+55 11 99999-9999"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Website / Landing Page
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://robertoguimaraes.com.br"
                className={`w-full bg-neutral-950 border ${
                  errors.website ? 'border-rose-500 focus:border-rose-400' : 'border-neutral-800 focus:border-amber-500'
                } rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden font-mono`}
              />
              {errors.website && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.website}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Cidade / Praça de Atuação
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={e => handleChange('city', e.target.value)}
                placeholder="Ex: Curitiba - PR (Batel)"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Market & Segmentation */}
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              2. Segmento & Posicionamento Comercial
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Segmento Principal *
              </label>
              <input
                type="text"
                value={formData.segment}
                onChange={e => handleChange('segment', e.target.value)}
                placeholder="Ex: Medicina Estética, Advocacia Corporativa, Imóveis de Luxo..."
                className={`w-full bg-neutral-950 border ${
                  errors.segment ? 'border-rose-500 focus:border-rose-400' : 'border-neutral-800 focus:border-amber-500'
                } rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden`}
              />
              {errors.segment && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.segment}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Subsegmento / Nicho Específico
              </label>
              <input
                type="text"
                value={formData.subsegment}
                onChange={e => handleChange('subsegment', e.target.value)}
                placeholder="Ex: Rejuvenescimento Facial, Fusões e Aquisições..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Ticket Médio de Referência
              </label>
              <input
                type="text"
                value={formData.averageTicket}
                onChange={e => handleChange('averageTicket', e.target.value)}
                placeholder="Ex: R$ 15.000,00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Etapa do Onboarding (1 a 10)
              </label>
              <select aria-label="Etapa do onboarding"
                value={formData.onboardingStep}
                onChange={e => handleChange('onboardingStep', parseInt(e.target.value, 10))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-hidden focus:border-amber-500 font-mono cursor-pointer"
              >
                {ONBOARDING_STEPS.map(s => (
                  <option key={s.step} value={s.step}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Público-Alvo
              </label>
              <textarea
                rows={2}
                value={formData.targetAudience}
                onChange={e => handleChange('targetAudience', e.target.value)}
                placeholder="Faixa etária, classe econômica, profissão, estilo de vida..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Persona Central
              </label>
              <textarea
                rows={2}
                value={formData.persona}
                onChange={e => handleChange('persona', e.target.value)}
                placeholder="Nome fictício, idade, maiores medos, desejos e objeções..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Editorial Strategy */}
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              3. Estratégia Editorial & Pilares
            </h3>
          </div>

          {/* Formats */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Formatos Prioritários
            </label>
            <div className="flex flex-wrap gap-2">
              {VALID_FORMATS.map(fmt => {
                const active = formats.includes(fmt);
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{fmt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pillars */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Pilares de Conteúdo
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DEFAULT_PILLARS.map(p => {
                const active = pillars.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePillar(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={customPillar}
                onChange={e => setCustomPillar(e.target.value)}
                placeholder="Adicionar pilar personalizado..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addCustomPillar}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Objetivos de Negócio
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DEFAULT_OBJECTIVES.map(obj => {
                const active = objectives.includes(obj);
                return (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => toggleObjective(obj)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{obj}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={customObjective}
                onChange={e => setCustomObjective(e.target.value)}
                placeholder="Adicionar objetivo personalizado..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addCustomObjective}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Differentiators & Tone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Diferenciais Competitivos
              </label>
              <textarea
                rows={2}
                value={formData.differentiators}
                onChange={e => handleChange('differentiators', e.target.value)}
                placeholder="Tecnologia exclusiva, formação, atendimento VIP..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Tom de Voz & Diretrizes
              </label>
              <textarea
                rows={2}
                value={formData.toneOfVoice}
                onChange={e => handleChange('toneOfVoice', e.target.value)}
                placeholder="Ex: Clínico, sofisticado, sóbrio, empático..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleSafeClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-500/10"
          >
            {initialData ? 'Salvar Alterações' : 'Concluir Cadastro'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
