import Company from '../models/Company.js';

export const createCompany = async (req, res) => {
  try {
    const ownerId = req.headers['x-user-id'] || req.body.ownerId;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID is required' });

    // Enforce 5 company limit
    const count = await Company.countDocuments({ ownerId });
    // Note: We only enforce this for non-super-admins if we had roles here, 
    // but the request specifically says "Owner can create and manage up to 5".
    if (count >= 5) {
      return res.status(403).json({ message: 'You have reached the maximum limit of 5 companies.' });
    }

    // Check if we are updating an existing one (simple approach for this MVP)
    // Actually, createCompany should probably be used for new ones.
    const company = new Company({ ...req.body, ownerId });
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.headers['x-user-id'];
    const company = await Company.findOneAndUpdate({ _id: id, ownerId }, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found or access denied' });
    res.status(200).json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllCompanies = async (req, res) => {
  try {
    const ownerId = req.headers['x-user-id'];
    // Super Admin usually doesn't pass x-user-id or we handle it differently.
    // For now, if x-user-id is present, filter. If not (super admin dashboard), return all.
    const query = ownerId ? { ownerId } : {};
    const companies = await Company.find(query);
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
