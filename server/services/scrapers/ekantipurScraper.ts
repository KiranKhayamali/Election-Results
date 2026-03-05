import axios from 'axios';
import * as cheerio from 'cheerio';
import Party from '../../models/Party';
import ElectionUpdate from '../../models/ElectionUpdate';
import { AggregationResult } from '../../types';

const EKANTIPUR_URL = process.env.EKANTIPUR_URL || 'https://election.ekantipur.com/?lng=eng';

export const scrapeEkantipurSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping Ekantipur source:', EKANTIPUR_URL);
    
    const response = await axios.get(EKANTIPUR_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let partiesUpdated = 0;
    
    // Placeholder implementation
    // Inspect the actual HTML structure of election.ekantipur.com
    // and update selectors accordingly
    
    // Example: Look for party standings
    const rows = $('.party-result, .election-result').toArray();
    for (const element of rows) {
      try {
        const partyName = $(element).find('.party-name').text().trim();
        const seatsWon = parseInt($(element).find('.seats-won').text().trim()) || 0;
        const seatsLeading = parseInt($(element).find('.seats-leading').text().trim()) || 0;
        
        if (partyName) {
          const party = await Party.findOne({ name: partyName });
          
          if (party) {
            // Cross-reference with existing data
            party.sources.push({
              name: 'ekantipur',
              url: EKANTIPUR_URL,
              timestamp: new Date(),
              seatsWon,
              seatsLeading
            });
            
            // Only update if official data is not available or if Ekantipur has newer data
            if (!party.sources.find(s => s.name === 'official') || 
                seatsWon > party.seatsWon) {
              party.seatsWon = seatsWon;
              party.seatsLeading = seatsLeading;
              party.lastUpdated = new Date();
            }
            
            await party.save();
            partiesUpdated++;
          } else {
            // Create new party if not exists
            await Party.create({
              name: partyName,
              seatsWon,
              seatsLeading,
              lastUpdated: new Date(),
              sources: [{
                name: 'ekantipur',
                url: EKANTIPUR_URL,
                timestamp: new Date(),
                seatsWon,
                seatsLeading
              }]
            });
            partiesUpdated++;
          }
        }
      } catch (err) {
        console.error('Error processing Ekantipur data:', err);
      }
    }
    
    // Create update record
    await ElectionUpdate.create({
      source: 'ekantipur',
      sourceUrl: EKANTIPUR_URL,
      updateType: 'party-standings',
      title: 'Ekantipur Election Results Update',
      description: `Updated ${partiesUpdated} parties from Ekantipur`,
      timestamp: new Date(),
      isVerified: false
    });
    
    console.log(`Ekantipur source: Updated ${partiesUpdated} parties`);
    
    return {
      success: true,
      source: 'ekantipur',
      partiesUpdated
    };
    
  } catch (error) {
    console.error('Error scraping Ekantipur source:', error);
    return {
      success: false,
      source: 'ekantipur',
      error: (error as Error).message
    };
  }
};
