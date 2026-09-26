import { describe, expect, it } from 'vitest';
import { BACKUP_APP, backupStats, parseBackup } from '../src/services/backupService';

describe('backup', () => {
  it('aceita backup válido e conta registros', () => {
    const f = parseBackup(JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: '2026-09-26T12:00:00Z', data: { gs_intel_tasks: [{ id: 'a' }], gs_intel_ideas: [] } }));
    expect(backupStats(f).total).toBe(1);
  });

  it('recusa arquivos que não são backup, versões futuras e seções corrompidas', () => {
    expect(() => parseBackup('isso não é json')).toThrow('JSON válido');
    expect(() => parseBackup(JSON.stringify({ foo: 1 }))).toThrow('não é um backup');
    expect(() => parseBackup(JSON.stringify({ app: BACKUP_APP, version: 99, data: {} }))).toThrow('versão mais nova');
    expect(() => parseBackup(JSON.stringify({ app: BACKUP_APP, version: 1, data: { gs_intel_tasks: 'x' } }))).toThrow('corrompida');
  });
});
