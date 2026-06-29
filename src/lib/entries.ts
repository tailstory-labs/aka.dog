import type { Entry } from './types';

// Vite imports JSON natively → no parser, no parse step. The build gate (npm run validate)
// has already structurally + semantically validated every file before the build runs.
const files = import.meta.glob('../../data/entries/*.json', {
  import: 'default',
  eager: true,
}) as Record<string, Entry[]>;

export const entries: Entry[] = Object.values(files).flat();
