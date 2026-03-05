import axios from 'axios';
import * as cheerio from 'cheerio';
import Party from '../../models/Party';
import ElectionUpdate from '../../models/ElectionUpdate';
import { AggregationResult } from '../../types';

const ONLINEKHABAR_URL = process.env.ONLINEKHABAR_URL || 'https://election.onlinekhabar.com/';

export const scrapeOnlineKhabarSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping OnlineKhabar source:', ONLINEKHABAR_URL);
    
    const response = await axios.get(ONLINEKHABAR_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let partiesUpdated = 0;
    
    // Placeholder implementation
    // Inspect the actual HTML structure of election.onlinekhabar.com
    // and update selectors accordingly
    
    // Example: Look for party standings
    const rows = $('.result-table tr, .party-item').toArray();
    for (const element of rows) {
      try {
        const partyName = $(element).find('.party-name, td:first-child').text().trim();
        const seatsWon = parseInt($(element).find('.won, td:nth-child(2)').text().trim()) || 0;
        const seatsLeading = parseInt($(element).find('.leading, td:nth-child(3)').text().trim()) || 0;
        
        if (partyName) {
          const party = await Party.findOne({ name: partyName });
          
          if (party) {
            // Cross-reference with existing data
            party.sources.push({
              name: 'onlinekhabar',
              url: ONLINEKHABAR_URL,
              timestamp: new Date(),
              seatsWon,
              seatsLeading
            });
            
            // Only update if official data is not available
            if (!party.sources.find(s => s.name === 'official')) {
              // Average the secondary sources if both exist
              const ekantipurSource = party.sources.find(s => s.name === 'ekantipur');
              if (ekantipurSource) {
                party.seatsWon = Math.round((seatsWon + (ekantipurSource.seatsWon || 0)) / 2);
                party.seatsLeading = Math.round((seatsLeading + (ekantipurSource.seatsLeading || 0)) / 2);
              } else {
                party.seatsWon = seatsWon;
                party.seatsLeading = seatsLeading;
              }
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
                name: 'onlinekhabar',
                url: ONLINEKHABAR_URL,
                timestamp: new Date(),
                seatsWon,
                seatsLeading
              }]
            });
            partiesUpdated++;
          }
        }
      } catch (err) {
        console.error('Error processing OnlineKhabar data:', err);
      }
    }
    
    // Create update record
    await ElectionUpdate.create({
      source: 'onlinekhabar',
      sourceUrl: ONLINEKHABAR_URL,
      updateType: 'party-standings',
      title: 'OnlineKhabar Election Results Update',
      description: `Updated ${partiesUpdated} parties from OnlineKhabar`,
      timestamp: new Date(),
      isVerified: false
    });
    
    console.log(`OnlineKhabar source: Updated ${partiesUpdated} parties`);
    
    return {
      success: true,
      source: 'onlinekhabar',
      partiesUpdated
    };
    
  } catch (error) {
    console.error('Error scraping OnlineKhabar source:', error);
    return {
      success: false,
      source: 'onlinekhabar',
      error: (error as Error).message
    };
  }
};
