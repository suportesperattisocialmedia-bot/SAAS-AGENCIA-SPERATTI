/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Legacy mockData entry point - Delegates strictly to typed Demo Data Package
 */

export * from './demo/demoData';

export const generateDemoSnapshots = (clientId: string) => {
  const { DEMO_SNAPSHOTS } = require('./demo/demoData');
  return DEMO_SNAPSHOTS.map((s: any) => ({ ...s, clientId }));
};
