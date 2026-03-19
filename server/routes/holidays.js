import express from 'express';
import { addHoliday, updateHoliday, deleteHoliday, getAllHolidays, seedSundays } from '../controllers/holidayController.js';

const router = express.Router();

router.post('/', addHoliday);
router.get('/', getAllHolidays);
router.put('/:id', updateHoliday);
router.put('/', updateHoliday);
router.delete('/:id', deleteHoliday);
router.post('/seed-sundays', seedSundays);

export default router;
