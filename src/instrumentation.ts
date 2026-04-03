export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSyncWorker } = await import('./lib/workers/sync-worker');
    initSyncWorker();
  }
}
