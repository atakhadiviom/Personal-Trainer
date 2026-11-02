import { describe, it, expect } from 'vitest';
import { manualChunks } from '../utils/chunkSplitter.js';
import fs from 'fs';
import path from 'path';

describe('manualChunks bundle optimization', () => {
  it('assigns recharts, d3, and victory-vendor to the recharts chunk', () => {
    expect(manualChunks('/path/to/node_modules/recharts/lib/index.js')).toBe('recharts');
    expect(manualChunks('/path/to/node_modules/d3-shape/src/line.js')).toBe('recharts');
    expect(manualChunks('/path/to/node_modules/victory-vendor/d3.js')).toBe('recharts');
  });

  it('assigns Firebase Auth to firebase-auth chunk', () => {
    expect(manualChunks('/path/to/node_modules/@firebase/auth/dist/esm/index.js')).toBe('firebase-auth');
    expect(manualChunks('/path/to/node_modules/firebase/auth/dist/esm/index.esm.js')).toBe('firebase-auth');
  });

  it('assigns Firebase Firestore to firebase-firestore chunk', () => {
    expect(manualChunks('/path/to/node_modules/@firebase/firestore/dist/index.esm.js')).toBe('firebase-firestore');
    expect(manualChunks('/path/to/node_modules/@firebase/firestore/dist/common-CLMydGSF.esm.js')).toBe('firebase-firestore');
    expect(manualChunks('/path/to/node_modules/firebase/firestore/dist/esm/index.esm.js')).toBe('firebase-firestore');
  });

  it('assigns Firebase Storage and Analytics to their respective isolated chunks', () => {
    expect(manualChunks('/path/to/node_modules/@firebase/storage/dist/index.esm.js')).toBe('firebase-storage');
    expect(manualChunks('/path/to/node_modules/firebase/storage/dist/esm/index.esm.js')).toBe('firebase-storage');
    expect(manualChunks('/path/to/node_modules/@firebase/analytics/dist/esm/index.esm.js')).toBe('firebase-analytics');
    expect(manualChunks('/path/to/node_modules/firebase/analytics/dist/esm/index.esm.js')).toBe('firebase-analytics');
  });

  it('assigns Firebase core, webchannel, and general packages to firebase-app chunk', () => {
    expect(manualChunks('/path/to/node_modules/@firebase/app/dist/esm/index.esm.js')).toBe('firebase-app');
    expect(manualChunks('/path/to/node_modules/@firebase/webchannel-wrapper/dist/webchannel-blob/esm/webchannel_blob_es2018.js')).toBe('firebase-app');
    expect(manualChunks('/path/to/node_modules/firebase/app/dist/esm/index.esm.js')).toBe('firebase-app');
  });

  it('never assigns application source files to vendor chunks', () => {
    expect(manualChunks('/Users/dev/Personal-Trainer/src/App.jsx')).toBeUndefined();
    expect(manualChunks('/Users/dev/Personal-Trainer/src/firebase.js')).toBeUndefined();
    expect(manualChunks('/Users/dev/Personal-Trainer/src/components/Dashboard/MyPlan.jsx')).toBeUndefined();
    expect(manualChunks('/Users/dev/Personal-Trainer/src/components/Dashboard/ProfilePage.jsx')).toBeUndefined();
  });

  it('returns undefined for non-vendor dependencies or invalid inputs', () => {
    expect(manualChunks(null)).toBeUndefined();
    expect(manualChunks(undefined)).toBeUndefined();
    expect(manualChunks('')).toBeUndefined();
    expect(manualChunks('/path/to/node_modules/react/index.js')).toBeUndefined();
    expect(manualChunks('/path/to/node_modules/react-dom/index.js')).toBeUndefined();
  });

  it('verifies that all built production JS bundles in dist/assets are strictly under 500 kB', () => {
    const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');
    if (!fs.existsSync(distAssetsDir)) {
      return;
    }
    const files = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);

    const maxSizeBytes = 500 * 1024; // 500 KiB threshold
    files.forEach(file => {
      const stats = fs.statSync(path.join(distAssetsDir, file));
      expect(stats.size).toBeLessThanOrEqual(maxSizeBytes);
    });
  });
});
