import express from 'express';
import {
  getAllConstituencies,
  getConstituencyById,
  getConstituencyResults,
  getConstituenciesByProvince
} from '../controllers/constituencyController';

const router = express.Router();

// GET /api/constituencies - Get all constituencies
router.get('/', getAllConstituencies);

// GET /api/constituencies/province/:provinceNumber - Get by province
router.get('/province/:provinceNumber', getConstituenciesByProvince);

// GET /api/constituencies/:id - Get specific constituency
router.get('/:id', getConstituencyById);

// GET /api/constituencies/:id/results - Get constituency results with candidates
router.get('/:id/results', getConstituencyResults);

export default router;
