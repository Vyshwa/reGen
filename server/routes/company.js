import express from 'express';
import { createCompany, getAllCompanies, updateCompany } from '../controllers/companyController.js';

const router = express.Router();

router.post('/', createCompany);
router.get('/', getAllCompanies);
router.put('/:id', updateCompany);

export default router;
