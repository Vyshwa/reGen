import ScrumNote from '../models/ScrumNote.js';

export const addScrumNote = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.timer === undefined) payload.timer = 0;
    if (payload.elapsedMs === undefined) payload.elapsedMs = 0;
    const note = new ScrumNote(payload);
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateScrumNote = async (req, res) => {
  try {
    const id = req.params.id;
    const prev = await ScrumNote.findOne({ id });
    if (!prev) return res.status(404).json({ message: 'Scrum note not found' });
    const payload = { ...req.body };
    if (payload.timer === undefined) payload.timer = typeof prev.timer === 'number' ? prev.timer : 0;
    if (payload.elapsedMs === undefined) payload.elapsedMs = typeof prev.elapsedMs === 'number' ? prev.elapsedMs : 0;
    if (payload.status === 'paused' && !payload.pausedAt) payload.pausedAt = new Date().toISOString();
    const note = await ScrumNote.findOneAndUpdate({ id }, payload, { new: true });
    if (!note) return res.status(404).json({ message: 'Scrum note not found' });
    res.status(200).json(note);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllScrumNotes = async (_req, res) => {
  try {
    const notes = await ScrumNote.find().sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserScrumNotes = async (req, res) => {
  try {
    const notes = await ScrumNote.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
