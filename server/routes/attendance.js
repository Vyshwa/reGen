import express from 'express';
import { recordAttendance, getAllAttendance, getUserAttendance, updateAttendance } from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/', recordAttendance);
router.get('/', getAllAttendance);
router.get('/user/:userId', getUserAttendance);
router.put('/:id', updateAttendance);
router.put('/', updateAttendance);

export default router;
