import express from 'express';
import {
  getOverallResults,
  getRecentUpdates,
  getProvinceResults,
  triggerManualUpdate
} from '../controllers/electionController';

const router = express.Router();

// GET /api/elections/overview - Get overall election statistics
router.get('/overview', getOverallResults);

// GET /api/elections/updates - Get recent election updates
router.get('/updates', getRecentUpdates);

// GET /api/elections/province/:provinceNumber - Get province-specific results
router.get('/province/:provinceNumber', getProvinceResults);

// POST /api/elections/refresh - Manually trigger data refresh
router.post('/refresh', triggerManualUpdate);

export default router;
