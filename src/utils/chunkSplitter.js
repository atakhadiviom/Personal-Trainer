/**
 * Vendor chunk splitting strategy for Vite / Rolldown production builds.
 * Isolates heavy subpackages (Recharts, Firebase Firestore, Firebase Auth, etc.)
 * into granular chunks strictly under 500 kB to prevent monolithic vendor bundles
 * and eliminate Vite chunk size warnings.
 *
 * @param {string} id - Absolute module path resolved during bundling.
 * @returns {string | undefined} - Target chunk name, or undefined for default chunking.
 */
export function manualChunks(id) {
  if (!id || typeof id !== 'string' || !id.includes('node_modules')) {
    return undefined;
  }

  // 1. Data visualization — isolate Recharts, D3, and Victory vendor modules (~355 kB)
  if (
    id.includes('recharts') ||
    id.includes('d3-') ||
    id.includes('victory-vendor')
  ) {
    return 'recharts';
  }

  // 2. Firebase Auth — independent authentication chunk (~70 kB)
  if (id.includes('@firebase/auth') || id.includes('/firebase/auth/')) {
    return 'firebase-auth';
  }

  // 3. Firebase Firestore — heavy database & persistence engine (~462 kB)
  if (id.includes('@firebase/firestore') || id.includes('/firebase/firestore/')) {
    return 'firebase-firestore';
  }

  // 4. Firebase Storage (~11 kB)
  if (id.includes('@firebase/storage') || id.includes('/firebase/storage/')) {
    return 'firebase-storage';
  }

  // 5. Firebase Analytics (~46 kB)
  if (id.includes('@firebase/analytics') || id.includes('/firebase/analytics/')) {
    return 'firebase-analytics';
  }

  // 6. Firebase Core / WebChannel / App runtime (~49 kB)
  if (id.includes('firebase') || id.includes('@firebase')) {
    return 'firebase-app';
  }

  return undefined;
}
