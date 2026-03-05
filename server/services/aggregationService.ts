import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import { scrapeOfficialSource } from './scrapers/officialScraper';
import { scrapeEkantipurSource } from './scrapers/ekantipurScraper';
import { scrapeOnlineKhabarSource } from './scrapers/onlinekhabarScraper';
import { AggregationResult } from '../types';

export const startDataAggregation = (socketIO: SocketIOServer): void => {
  console.log('Starting data aggregation service...');
  
  // Initial fetch
  void fetchAllSources(socketIO);

  // Support both milliseconds (e.g. 300000) and cron expression values.
  const pollingIntervalRaw = (process.env.POLLING_INTERVAL || '').trim();
  const pollingIntervalMs = Number(pollingIntervalRaw);

  if (pollingIntervalRaw && Number.isFinite(pollingIntervalMs) && pollingIntervalMs > 0) {
    setInterval(() => {
      console.log('Scheduled update triggered');
      void fetchAllSources(socketIO);
    }, pollingIntervalMs);
    console.log(`Data aggregation scheduled every ${pollingIntervalMs} ms`);
  } else {
    const cronExpression = pollingIntervalRaw || '*/5 * * * *';
    cron.schedule(cronExpression, () => {
      console.log('Scheduled update triggered');
      void fetchAllSources(socketIO);
    });
    console.log(`Data aggregation scheduled with cron: ${cronExpression}`);
  }

  console.log('Data aggregation service started');
};

export const fetchAllSources = async (socketIO: SocketIOServer): Promise<AggregationResult[]> => {
  const results: AggregationResult[] = [];
  
  console.log('Fetching data from all sources...');
  
  try {
    // Fetch from official source (primary)
    const officialResult = await scrapeOfficialSource();
    results.push(officialResult);
    
    if (officialResult.success) {
      socketIO.emit('data-update', {
        source: 'official',
        timestamp: new Date(),
        data: officialResult
      });
    }
  } catch (error) {
    console.error('Error fetching official source:', error);
    results.push({
      success: false,
      source: 'official',
      error: (error as Error).message
    });
  }
  
  try {
    // Fetch from Ekantipur (secondary)
    const ekantipurResult = await scrapeEkantipurSource();
    results.push(ekantipurResult);
    
    if (ekantipurResult.success) {
      socketIO.emit('data-update', {
        source: 'ekantipur',
        timestamp: new Date(),
        data: ekantipurResult
      });
    }
  } catch (error) {
    console.error('Error fetching Ekantipur source:', error);
    results.push({
      success: false,
      source: 'ekantipur',
      error: (error as Error).message
    });
  }
  
  try {
    // Fetch from OnlineKhabar (secondary)
    const onlinekhabarResult = await scrapeOnlineKhabarSource();
    results.push(onlinekhabarResult);
    
    if (onlinekhabarResult.success) {
      socketIO.emit('data-update', {
        source: 'onlinekhabar',
        timestamp: new Date(),
        data: onlinekhabarResult
      });
    }
  } catch (error) {
    console.error('Error fetching OnlineKhabar source:', error);
    results.push({
      success: false,
      source: 'onlinekhabar',
      error: (error as Error).message
    });
  }
  
  // Emit summary
  const successCount = results.filter(r => r.success).length;
  console.log(`Data aggregation complete: ${successCount}/${results.length} sources successful`);
  
  socketIO.emit('aggregation-complete', {
    timestamp: new Date(),
    results
  });
  
  return results;
};
