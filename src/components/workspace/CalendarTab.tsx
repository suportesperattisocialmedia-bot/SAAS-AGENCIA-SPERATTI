import React, { useState } from 'react';
import { Client, CalendarItem, ContentFormat, ContentPillar } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Layers,
  CheckCircle2,
  MoveRight
} from 'lucide-react';

interface CalendarTabProps {
  client: Client;
  calendarItems: CalendarItem[];
  onRefresh: () => void;
}

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export const CalendarTab: React.FC<CalendarTabProps> = ({
  client,
  calendarItems,
  onRefresh
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetDay, setTargetDay] = useState<string>('Segunda-feira');
  const [newItemForm, setNewItemForm] = useState({
    title: '',
    format: 'Reels' as ContentFormat,
    pillar: 'Educação' as ContentPillar,
    hook: '',
    timeSlot: '18:30',
    notes: ''
  });

  const handleOpenAddForDay = (day: string) => {
    setTargetDay(day);
    setShowAddModal(true);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.title) return;

    storageService.calendar.addItem({
      clientId: client.id,
      dayOfWeek: targetDay,
      title: newItemForm.title,
      format: newItemForm.format,
      pillar: newItemForm.pillar,
      status: 'PLANEJADO',
      hook: newItemForm.hook,
      timeSlot: newItemForm.timeSlot,
      notes: newItemForm.notes
    });

    notificationService.showToast(`Conteúdo agendado para ${targetDay}.`, 'success');
    setShowAddModal(false);
    setNewItemForm({
      title: '',
      format: 'Reels',
      pillar: 'Educação',
      hook: '',
      timeSlot: '18:30',
      notes: ''
    });
    onRefresh();
  };

  const handleDeleteItem = (id: string) => {
    storageService.calendar.deleteItem(id);
    onRefresh();
  };

  const handleMoveDay = (item: CalendarItem, newDay: string) => {
    storageService.calendar.updateItem(item.id, { dayOfWeek: newDay });
    notificationService.showToast(`Movido para ${newDay}`, 'info');
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Planejamento Editorial Semanal</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              {calendarItems.length} publicações programadas
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cadência estratégica distribuída de Segunda a Domingo para {client.name}
          </p>
        </div>

        <button
          onClick={() => handleOpenAddForDay('Segunda-feira')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agendar Conteúdo</span>
        </button>
      </div>

      {/* 7-Days Weekly Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map(day => {
          const dayItems = calendarItems.filter(i => i.dayOfWeek === day);

          return (
            <div
              key={day}
              className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between min-h-[380px]"
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                  <div>
                    <span className="text-xs font-bold font-mono text-neutral-200">
                      {day.split('-')[0]}
                    </span>
                    <span className="block text-[10px] text-neutral-500 font-mono">
                      {dayItems.length} post(s)
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenAddForDay(day)}
                    className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                    title={`Adicionar para ${day}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Items */}
                <div className="space-y-2.5">
                  {dayItems.map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs space-y-1.5 group transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-500/30">
                          {item.format}
                        </span>
                        {item.timeSlot && (
                          <span className="text-neutral-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {item.timeSlot}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-neutral-200 leading-snug line-clamp-2">
                        {item.title}
                      </div>

                      {item.hook && (
                        <p className="text-[11px] text-neutral-400 italic line-clamp-2">
                          &quot;{item.hook}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[10px] font-mono text-neutral-500">
                        <span>{item.pillar}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select
                            onChange={(e) => handleMoveDay(item, e.target.value)}
                            value=""
                            title="Mover de dia"
                            className="bg-neutral-900 text-neutral-400 text-[10px] rounded px-1 py-0.5 cursor-pointer"
                          >
                            <option value="" disabled>→</option>
                            {DAYS_OF_WEEK.filter(d => d !== day).map(d => (
                              <option key={d} value={d}>{d.split('-')[0]}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-neutral-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {dayItems.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-neutral-600 font-mono">
                      Sem posts
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick-Add trigger */}
              <button
                onClick={() => handleOpenAddForDay(day)}
                className="w-full mt-3 py-1 text-[11px] font-mono text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 rounded border border-dashed border-neutral-800 transition-colors"
              >
                + Adicionar
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Calendar Item Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={`Agendar Conteúdo: ${targetDay}`}
          subtitle={`Planejamento editorial de ${client.name}`}
        >
          <form onSubmit={handleCreateItem} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-neutral-400 mb-1">Título do Conteúdo *</label>
              <input
                type="text"
                required
                value={newItemForm.title}
                onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                placeholder="Ex: Por que o Deep Plane não estica a pele"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Formato</label>
                <select
                  value={newItemForm.format}
                  onChange={(e) => setNewItemForm({ ...newItemForm, format: e.target.value as any })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                >
                  <option value="Reels">Reels</option>
                  <option value="Carrossel">Carrossel</option>
                  <option value="Foto">Foto</option>
                  <option value="Stories">Stories</option>
                  <option value="Live">Live</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Pilar de Conteúdo</label>
                <select
                  value={newItemForm.pillar}
                  onChange={(e) => setNewItemForm({ ...newItemForm, pillar: e.target.value as any })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                >
                  <option value="Educação">Educação</option>
                  <option value="Autoridade">Autoridade</option>
                  <option value="Prova social">Prova social</option>
                  <option value="Bastidores">Bastidores</option>
                  <option value="Venda">Venda</option>
                  <option value="Conexão">Conexão</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Horário Recomendado</label>
                <input
                  type="text"
                  value={newItemForm.timeSlot}
                  onChange={(e) => setNewItemForm({ ...newItemForm, timeSlot: e.target.value })}
                  placeholder="Ex: 18:30"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Dia da Semana</label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Gancho Estratégico</label>
              <textarea
                rows={2}
                value={newItemForm.hook}
                onChange={(e) => setNewItemForm({ ...newItemForm, hook: e.target.value })}
                placeholder="Ex: Três coisas que ninguém te conta sobre a cicatriz atrás da orelha..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded hover:bg-amber-400"
              >
                Salvar no Calendário
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
