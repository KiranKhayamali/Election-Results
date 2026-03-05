import axios from 'axios';
import * as cheerio from 'cheerio';
import Party from '../../models/Party';
import ElectionUpdate from '../../models/ElectionUpdate';
import { AggregationResult } from '../../types';

const OFFICIAL_URL = process.env.PRIMARY_SOURCE_URL || 'https://result.election.gov.np/';

export const scrapeOfficialSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping official source:', OFFICIAL_URL);
    
    const response = await axios.get(OFFICIAL_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let partiesUpdated = 0;
    
    // This is a placeholder implementation
    // You'll need to inspect the actual HTML structure of result.election.gov.np
    // and update the selectors accordingly
    
    // Example: Look for party data in tables
    const rows = $('table tr').toArray();
    for (const element of rows) {
      try {
        const cells = $(element).find('td');
        if (cells.length >= 3) {
          const partyName = $(cells[0]).text().trim();
          const seatsWon = parseInt($(cells[1]).text().trim()) || 0;
          const seatsLeading = parseInt($(cells[2]).text().trim()) || 0;
          
          if (partyName) {
            await Party.findOneAndUpdate(
              { name: partyName },
              {
                $set: {
                  seatsWon,
                  seatsLeading,
                  lastUpdated: new Date()
                },
                $push: {
                  sources: {
                    name: 'official',
                    url: OFFICIAL_URL,
                    timestamp: new Date(),
                    seatsWon,
                    seatsLeading
                  }
                }
              },
              { upsert: true, new: true }
            );
            
            partiesUpdated++;
          }
        }
      } catch (err) {
        console.error('Error processing row:', err);
      }
    }
    
    // Create update record
    await ElectionUpdate.create({
      source: 'official',
      sourceUrl: OFFICIAL_URL,
      updateType: 'party-standings',
      title: 'Official Election Results Update',
      description: `Updated ${partiesUpdated} parties from official source`,
      timestamp: new Date(),
      isVerified: true,
      verifiedBy: 'official'
    });
    
    console.log(`Official source: Updated ${partiesUpdated} parties`);
    
    return {
      success: true,
      source: 'official',
      partiesUpdated
    };
    
  } catch (error) {
    console.error('Error scraping official source:', error);
    return {
      success: false,
      source: 'official',
      error: (error as Error).message
    };
  }
};
