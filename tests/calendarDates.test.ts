import { describe, expect, it } from 'vitest';
import { monthWeeks, mondayOf, shiftMonth, weekDayOfDate, weekDates } from '../src/utils/calendarDates';

describe('calendarDates', () => {
  it('segunda da semana, inclusive a partir do domingo', () => {
    expect(mondayOf('2026-09-26')).toBe('2026-09-21'); // sábado
    expect(mondayOf('2026-09-27')).toBe('2026-09-21'); // domingo
    expect(mondayOf('2026-09-28')).toBe('2026-09-28');
  });
  it('dia da semana', () => {
    expect(weekDayOfDate('2026-09-26')).toBe('sabado');
    expect(weekDates('2026-09-24')).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
  });
  it('mês cobre todas as semanas e vira o ano', () => {
    const weeks = monthWeeks('2026-09');
    expect(weeks[0][0]).toBe('2026-08-31');
    expect(weeks.at(-1)!.at(-1)).toBe('2026-10-04');
    expect(weeks.flat()).toContain('2026-09-30');
    expect(monthWeeks('2026-02').length).toBe(4 + 1); // fev/2026 começa num domingo
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

import { nextDateForWeekDay } from '../src/utils/calendarDates';
describe('nextDateForWeekDay', () => {
  it('inclui o próprio dia e avança até 6 dias', () => {
    expect(nextDateForWeekDay('sabado', '2026-09-26')).toBe('2026-09-26');
    expect(nextDateForWeekDay('segunda', '2026-09-26')).toBe('2026-09-28');
    expect(nextDateForWeekDay('sexta', '2026-09-26')).toBe('2026-10-02');
  });
});
