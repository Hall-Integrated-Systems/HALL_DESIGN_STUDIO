import { zipSync } from 'three/examples/jsm/libs/fflate.module.js';

/** Deterministic, bounded ZIP adapter for the three required 3MF parts. */
export function encodeZip(files: Record<string, Uint8Array>): Uint8Array {
  const names = Object.keys(files).sort();
  if (names.length === 0 || names.length > 16) throw new Error('Invalid ZIP part count.');
  const ordered: Record<string, [Uint8Array, { level: 0; mtime: Date }]> = {};
  for (const name of names) {
    if (!name || name.startsWith('/') || name.includes('..') || name.includes('\\') || !(files[name] instanceof Uint8Array)) {
      throw new Error('Invalid ZIP part name or bytes.');
    }
    ordered[name] = [files[name], { level: 0, mtime: new Date(2020, 0, 1) }];
  }
  return zipSync(ordered);
}
