import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';

export const maintenanceCheck = async (req, res, next) => {
  try {
    // Check if maintenance mode is ON
    const setting = await SystemSetting.findOne({ key: 'maintenance_mode' });
    const isMaintenance = setting?.value === true;

    if (isMaintenance) {
      // Allow if the user is a Super Admin
      // Expecting x-user-id header which the frontend should send
      const userId = req.headers['x-user-id'];
      
      if (userId) {
        const user = await User.findOne({ $or: [{ userId }, { username: userId }] });
        if (user && ['param', 'owner', 'admin'].includes(user.role)) {
          return next();
        }
      }

      return res.status(503).json({ 
        message: 'Maintenance Process Ongoing.',
        maintenance: true 
      });
    }

    next();
  } catch (error) {
    next(); // On error, allow request to proceed (safe fallback)
  }
};
