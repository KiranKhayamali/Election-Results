import { Server as SocketIOServer } from 'socket.io';
import { scrapeOfficialSource } from './scrapers/officialScraper';
import { scrapeEkantipurSource } from './scrapers/ekantipurScraper';
import { scrapeOnlineKhabarSource } from './scrapers/onlinekhabarScraper';
import { AggregationResult } from '../types';

const DEFAULT_PRIMARY_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SECONDARY_INTERVAL_MS = 1 * 60 * 1000;

const getIntervalMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number((value || '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

export const startDataAggregation = (socketIO: SocketIOServer): void => {
  console.log('Starting data aggregation service...');
  
  // Initial fetch from all configured sources.
  void fetchAllSources(socketIO);

  const primaryIntervalMs = getIntervalMs(process.env.PRIMARY_POLLING_INTERVAL_MS, DEFAULT_PRIMARY_INTERVAL_MS);
  const secondaryIntervalMs = getIntervalMs(process.env.SECONDARY_POLLING_INTERVAL_MS, DEFAULT_SECONDARY_INTERVAL_MS);

  setInterval(() => {
    console.log('Scheduled primary update triggered');
    void fetchPrimarySources(socketIO);
  }, primaryIntervalMs);

  setInterval(() => {
    console.log('Scheduled secondary update triggered');
    void fetchSecondarySources(socketIO);
  }, secondaryIntervalMs);

  console.log(`Primary source refresh scheduled every ${primaryIntervalMs} ms`);
  console.log(`Secondary sources refresh scheduled every ${secondaryIntervalMs} ms`);

  console.log('Data aggregation service started');
};

const fetchPrimarySources = async (socketIO: SocketIOServer): Promise<AggregationResult[]> => {
  const results: AggregationResult[] = [];

  try {
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

  socketIO.emit('aggregation-complete', {
    timestamp: new Date(),
    results
  });

  return results;
};

const fetchSecondarySources = async (socketIO: SocketIOServer): Promise<AggregationResult[]> => {
  const results: AggregationResult[] = [];

  try {
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

  socketIO.emit('aggregation-complete', {
    timestamp: new Date(),
    results
  });

  return results;
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
