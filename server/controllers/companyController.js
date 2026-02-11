import Company from '../models/Company.js';

export const saveCompanyInfo = async (req, res) => {
  try {
    // Assuming only one company info record exists or we replace it.
    // For simplicity, let's just delete all and save new, or update existing.
    await Company.deleteMany({});
    const company = new Company(req.body);
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCompanyInfo = async (req, res) => {
  try {
    const company = await Company.findOne();
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
