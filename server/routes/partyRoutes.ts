import express from 'express';
import {
  getAllParties,
  getPartyById,
  getPartyStandings
} from '../controllers/partyController';

const router = express.Router();

// GET /api/parties - Get all parties
router.get('/', getAllParties);

// GET /api/parties/standings - Get party standings sorted by seats
router.get('/standings', getPartyStandings);

// GET /api/parties/:id - Get specific party details
router.get('/:id', getPartyById);

export default router;
