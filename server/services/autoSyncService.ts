import { syncOfficialElectionData } from './scrapers/officialElectionDataScraper';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the automatic election data sync job
 * Syncs official election data every 1 minute
 */
export function startAutoSyncJob(io: any, intervalMinutes: number = 1): void {
  if (isRunning) {
    console.log('⚠️ Auto-sync job already running');
    return;
  }

  isRunning = true;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`🚀 Starting auto-sync job (every ${intervalMinutes} minute(s))`);

  // Run immediately on startup
  syncOfficialElectionData(io).catch(err => {
    console.error('❌ Initial sync failed:', err);
  });

  // Schedule recurring updates
  intervalId = setInterval(async () => {
    try {
      console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running scheduled election data sync...`);
      await syncOfficialElectionData(io);
    } catch (error) {
      console.error('❌ Auto-sync job error:', error);
    }
  }, intervalMs);

  console.log(`✅ Auto-sync job started with ${intervalMinutes} minute interval`);
}

/**
 * Stop the automatic election data sync job
 */
export function stopAutoSyncJob(): void {
  if (!isRunning) {
    console.log('⚠️ Auto-sync job is not running');
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log('🛑 Auto-sync job stopped');
}

/**
 * Get the current status of the auto-sync job
 */
export function getAutoSyncStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
  return {
    isRunning,
    intervalId
  };
}

/**
 * Manually trigger a sync (in addition to scheduled ones)
 */
export async function triggerManualSync(io: any): Promise<void> {
  console.log('🔔 Manual sync triggered');
  await syncOfficialElectionData(io);
}
