/** Datas sempre exibidas no fuso de Brasília, independentemente do computador. */
const TZ = 'America/Sao_Paulo';

export function formatDateBR(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ });
}

export function formatDateTimeBR(iso: string | number | Date): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ });
}
