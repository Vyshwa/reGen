import Task from '../models/Task.js';
import User from '../models/User.js';

export const createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    if (task.assignedTo) {
      try {
        const notificationPayload = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: task.assignedTo,
          title: 'New Task Assigned',
          message: `You have been assigned: ${task.title}`,
          createdAt: new Date().toISOString(),
          read: false
        };
        const { default: Notification } = await import('../models/Notification.js');
        const n = new Notification(notificationPayload);
        await n.save();
      } catch (e) {
        console.error(e);
      }
    }
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const id = req.body.id || req.params.id;
    const previous = await Task.findOne({ id });
    const task = await Task.findOneAndUpdate({ id }, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo) {
      try {
        const notificationPayload = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: task.assignedTo,
          title: 'Task Updated',
          message: `Your task was updated: ${task.title}`,
          createdAt: new Date().toISOString(),
          read: false
        };
        const { default: Notification } = await import('../models/Notification.js');
        const n = new Notification(notificationPayload);
        await n.save();
      } catch (e) {}
    }
    // Notify assignor if we can resolve their userId
    if (task.assignorName) {
      try {
        const assignor = await User.findOne({
          $or: [{ username: task.assignorName }, { name: task.assignorName }]
        });
        if (assignor && assignor.userId) {
          const statusLabel = String(task.status || '').replace('_', ' ') || 'updated';
          const { default: Notification } = await import('../models/Notification.js');
          const n2 = new Notification({
            id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: assignor.userId,
            title: 'Task Status Change',
            message: `Task "${task.title}" status: ${statusLabel}`,
            createdAt: new Date().toISOString(),
            read: false
          });
          await n2.save();
        }
      } catch (e) {}
    }
    res.status(200).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ id: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
