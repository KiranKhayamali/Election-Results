import express from 'express';
import {
  getOverallResults,
  getRecentUpdates,
  getProvinceResults,
  triggerManualUpdate,
  getLeadingCandidates,
  getAllProvincesResults,
  getLatestOfficialProvinceResults,
  getLatestEkantipurProvinceResults
} from '../controllers/electionController';

const router = express.Router();

// GET /api/elections/overview - Get overall election statistics
router.get('/overview', getOverallResults);

// GET /api/elections/all-provinces - Get comprehensive data for all 7 provinces
router.get('/all-provinces', getAllProvincesResults);

// GET /api/elections/leading-candidates - Get top leading candidates with vote differences
router.get('/leading-candidates', getLeadingCandidates);

// GET /api/elections/updates - Get recent election updates
router.get('/updates', getRecentUpdates);

// GET /api/elections/province/:provinceNumber - Get province-specific results
router.get('/province/:provinceNumber', getProvinceResults);

// GET /api/elections/provinces/official - Get latest official province scrape snapshot
router.get('/provinces/official', getLatestOfficialProvinceResults);

// GET /api/elections/provinces/ekantipur - Get latest Ekantipur province scrape snapshot
router.get('/provinces/ekantipur', getLatestEkantipurProvinceResults);

// POST /api/elections/refresh - Manually trigger data refresh
router.post('/refresh', triggerManualUpdate);

export default router;
