import express from 'express';
import {
  getAllCandidates,
  getCandidateById,
  searchCandidates,
  getCandidatesByParty,
  getCandidatesByConstituency
} from '../controllers/candidateController';

const router = express.Router();

// GET /api/candidates - Get all candidates
router.get('/', getAllCandidates);

// GET /api/candidates/search - Search candidates by name
router.get('/search', searchCandidates);

// GET /api/candidates/party/:partyId - Get candidates by party
router.get('/party/:partyId', getCandidatesByParty);

// GET /api/candidates/constituency/:constituencyId - Get candidates by constituency
router.get('/constituency/:constituencyId', getCandidatesByConstituency);

// GET /api/candidates/:id - Get specific candidate
router.get('/:id', getCandidateById);

export default router;
