import express from 'express';
import { addScrumNote, updateScrumNote, getAllScrumNotes, getUserScrumNotes } from '../controllers/scrumController.js';

const router = express.Router();

router.get('/', getAllScrumNotes);
router.get('/user/:userId', getUserScrumNotes);
router.post('/', addScrumNote);
router.put('/:id', updateScrumNote);

export default router;
