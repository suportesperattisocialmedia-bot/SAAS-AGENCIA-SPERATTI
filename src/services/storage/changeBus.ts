/**
 * Aviso de escrita no armazenamento local. A sincronização com a nuvem escuta
 * aqui para saber quais coleções mudaram, sem acoplar os adaptadores a ela.
 */

type Listener = (key: string) => void;

const listeners = new Set<Listener>();
let muted = 0;

export function onStorageWrite(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyStorageWrite(key: string): void {
  if (muted > 0) return;
  listeners.forEach((l) => l(key));
}

/** Executa escritas sem avisar (usado ao aplicar dados vindos da nuvem). */
export function withoutNotify<T>(fn: () => T): T {
  muted += 1;
  try {
    return fn();
  } finally {
    muted -= 1;
  }
}
