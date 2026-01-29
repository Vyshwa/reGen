import express from 'express';
import { createMessage, getAllMessages, deleteMessage } from '../controllers/messageController.js';

const router = express.Router();

router.post('/', createMessage);
router.get('/', getAllMessages);
router.delete('/:id', deleteMessage);

export default router;
