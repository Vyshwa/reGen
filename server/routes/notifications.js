import express from 'express';
import { createNotification, getUserNotifications, deleteNotification, runBirthdayReminders } from '../controllers/notificationController.js';

const router = express.Router();

router.post('/', createNotification);
router.post('/birthday-reminders/run', runBirthdayReminders);
router.get('/user/:userId', getUserNotifications);
router.delete('/:id', deleteNotification);

export default router;
