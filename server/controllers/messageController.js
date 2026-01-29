import Message from '../models/Message.js';

export const createMessage = async (req, res) => {
  try {
    const body = { ...req.body };
    body.messageId = body.messageId || body.id;
    const msg = new Message(body);
    await msg.save();
    res.status(201).json(msg);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllMessages = async (_req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: 1 });
    res.status(200).json(msgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const query = { $or: [{ messageId: id }, { id }, { _id: id }] };
    const msg = await Message.findOneAndDelete(query);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
