import User from '../models/User.js';

/**
 * Middleware that resolves the current user's companyId from the DB
 * and attaches it to req.companyId.
 *
 * - All users (including SuperAdmin/param) are scoped to their own companyId.
 * - If a user has no companyId and is an owner, it tries to resolve from Company collection.
 *
 * This must be placed AFTER verifyToken so req.user exists.
 */
export const companyScope = async (req, res, next) => {
  try {
    // Public paths don't need scoping
    const skipPaths = [
      '/api/auth/',
      '/api/health',
      '/api/system/',
      '/api/deploy/',
    ];
    if (skipPaths.some(p => req.path.startsWith(p))) return next();

    const decoded = req.user;
    if (!decoded || !decoded.userId) return next(); // no user context (handled by verifyToken)

    // Look up user to get their companyId
    const user = await User.findOne({ userId: decoded.userId }).lean();
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      // Owner might not have companyId set yet (legacy data).
      // Try to find it from Company collection.
      if (user.role === 'owner') {
        const { default: Company } = await import('../models/Company.js');
        const company = await Company.findOne({ ownerId: user.userId }).lean();
        if (company) {
          // Fix the user record for future calls
          await User.updateOne({ userId: user.userId }, { companyId: company._id });
          req.companyId = company._id;
          return next();
        }
      }
      // Users without a company yet — allow them through but mark companyId as undefined
      // Controllers will handle this (they'll see empty results which is correct)
      req.companyId = undefined;
      return next();
    }

    req.companyId = user.companyId;
    next();
  } catch (err) {
    console.error('companyScope middleware error:', err);
    return res.status(500).json({ message: 'Failed to resolve company context' });
  }
};
