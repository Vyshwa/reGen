import express from 'express';
import { createMessage, getAllMessages, updateMessage, deleteMessage } from '../controllers/messageController.js';

const router = express.Router();

router.post('/', createMessage);
router.get('/', getAllMessages);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);

export default router;
