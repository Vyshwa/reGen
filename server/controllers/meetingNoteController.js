import MeetingNote from '../models/MeetingNote.js';

export const addMeetingNote = async (req, res) => {
  try {
    const note = new MeetingNote(req.body);
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllMeetingNotes = async (_req, res) => {
  try {
    const notes = await MeetingNote.find().sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMeetingNote = async (req, res) => {
  try {
    const id = req.params.id;
    const note = await MeetingNote.findOneAndUpdate({ id }, req.body, { new: true });
    if (!note) return res.status(404).json({ message: 'Meeting note not found' });
    res.status(200).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMeetingNote = async (req, res) => {
  try {
    const note = await MeetingNote.findOneAndDelete({ id: req.params.id });
    if (!note) return res.status(404).json({ message: 'Meeting note not found' });
    res.status(200).json({ message: 'Meeting note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
