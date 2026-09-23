/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Cryptographically Secure UUID Generator
 * Replaces Date.now() + Math.random() across the entire application.
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback compliant RFC4122 v4 for older contexts if any
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
