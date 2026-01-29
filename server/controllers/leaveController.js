import Leave from '../models/Leave.js';

export const createLeave = async (req, res) => {
  try {
    const leave = new Leave(req.body);
    await leave.save();
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find();
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.params.userId });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const leave = await Leave.findOneAndUpdate({ id }, { status: req.body.status }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.status(200).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
