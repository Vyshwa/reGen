import jwt from 'jsonwebtoken';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in environment variables');
  return secret;
};

export const signToken = (user) => {
  return jwt.sign(
    { userId: user.userId, username: user.username, role: user.role, companyId: user.companyId || null },
    getSecret(),
    { expiresIn: '7d' }
  );
};

export const verifyToken = (req, res, next) => {
  // Public routes skip JWT verification
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/reset-password',
    '/api/auth/reset-link',
    '/api/health',
    '/api/system/maintenance',
  ];
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getSecret());
    req.user = decoded; // { userId, username, role, companyId, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default { signToken, verifyToken };
