import MeetingNote from '../models/MeetingNote.js';
import { resolveCompanyId } from '../utils/resolveCompanyId.js';

export const addMeetingNote = async (req, res) => {
  try {
    const body = { ...req.body };
    body.companyId = await resolveCompanyId(req, body);
    const note = new MeetingNote(body);
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllMeetingNotes = async (req, res) => {
  try {
    const filter = req.companyId ? { companyId: req.companyId } : {};
    const notes = await MeetingNote.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMeetingNote = async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { id };
    if (req.companyId) filter.companyId = req.companyId;
    const note = await MeetingNote.findOneAndUpdate(filter, req.body, { new: true });
    if (!note) return res.status(404).json({ message: 'Meeting note not found' });
    res.status(200).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMeetingNote = async (req, res) => {
  try {
    const note = await MeetingNote.findOneAndDelete(req.companyId ? { id: req.params.id, companyId: req.companyId } : { id: req.params.id });
    if (!note) return res.status(404).json({ message: 'Meeting note not found' });
    res.status(200).json({ message: 'Meeting note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
