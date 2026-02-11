import express from 'express';
import { saveCompanyInfo, getCompanyInfo } from '../controllers/companyController.js';

const router = express.Router();

router.post('/', saveCompanyInfo);
router.get('/', getCompanyInfo);

export default router;
