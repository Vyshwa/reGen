import Holiday from '../models/Holiday.js';

export const addHoliday = async (req, res) => {
  try {
    const h = new Holiday(req.body);
    await h.save();
    res.status(201).json(h);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const h = await Holiday.findOneAndUpdate({ id }, req.body, { new: true });
    if (!h) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json(h);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const id = req.params.id;
    const h = await Holiday.findOneAndDelete({ id });
    if (!h) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllHolidays = async (_req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const seedSundays = async (req, res) => {
  try {
    const name = req.body.name || 'Sunday';
    const startDate = req.body.startDate ? String(req.body.startDate) : null;
    const endDate = req.body.endDate ? String(req.body.endDate) : null;
    const year = Number(req.body.year) || new Date().getFullYear();
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(`${year}-01-01T00:00:00.000Z`);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(`${year}-12-31T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate/endDate' });
    }

    const ops = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() === 0) {
        const dateStr = d.toISOString().slice(0, 10);
        const id = `holiday-sunday-${dateStr}`;
        ops.push({
          updateOne: {
            filter: { id },
            update: { $set: { id, name, date: dateStr } },
            upsert: true
          }
        });
      }
    }
    if (ops.length > 0) {
      await Holiday.bulkWrite(ops);
    }
    res.status(200).json({ message: 'Seeded Sundays', startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), count: ops.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
