import express from 'express';
import { addMeetingNote, getAllMeetingNotes, updateMeetingNote, deleteMeetingNote } from '../controllers/meetingNoteController.js';

const router = express.Router();

router.get('/', getAllMeetingNotes);
router.post('/', addMeetingNote);
router.put('/:id', updateMeetingNote);
router.delete('/:id', deleteMeetingNote);

export default router;
