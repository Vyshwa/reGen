import express from 'express';
import {
  getOrCreateConversation,
  getMyConversations,
  getConversationMessages,
  sendDirectMessage,
  markAsRead,
  storePublicKey,
  editDirectMessage,
  deleteDirectMessage
} from '../controllers/dmController.js';

const router = express.Router();

// Conversations
router.post('/conversations', getOrCreateConversation);
router.get('/conversations', getMyConversations);

// Messages within a conversation
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.post('/conversations/:conversationId/messages', sendDirectMessage);
router.put('/conversations/:conversationId/read', markAsRead);

// E2E key exchange
router.post('/conversations/:conversationId/keys', storePublicKey);

// Edit / Delete individual messages
router.put('/messages/:messageId', editDirectMessage);
router.delete('/messages/:messageId', deleteDirectMessage);

export default router;
