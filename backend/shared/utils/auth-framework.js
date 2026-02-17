// Authentication and Authorization framework for Advanced Cloud Deployment

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// User roles and permissions
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  SERVICE: 'service'
};

const PERMISSIONS = {
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  REMINDER_MANAGE: 'reminder:manage',
  RECURRING_TASK_MANAGE: 'recurring-task:manage'
};

class AuthService {
  constructor(secret = process.env.JWT_SECRET || 'default_secret') {
    this.secret = secret;
    this.users = new Map(); // In production, use a database
  }

  // Create a new user
  async createUser(username, password, role = ROLES.USER) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role,
      permissions: this.getDefaultPermissions(role),
      createdAt: new Date()
    };
    
    this.users.set(user.id, user);
    return user;
  }

  // Authenticate user
  async authenticate(username, password) {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };

    return jwt.sign(payload, this.secret);
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Check if user has permission
  hasPermission(user, permission) {
    return user.permissions.includes(permission);
  }

  // Get default permissions for role
  getDefaultPermissions(role) {
    switch (role) {
      case ROLES.ADMIN:
        return Object.values(PERMISSIONS);
      case ROLES.USER:
        return [PERMISSIONS.TASK_CREATE, PERMISSIONS.TASK_READ, PERMISSIONS.TASK_UPDATE];
      case ROLES.SERVICE:
        return [PERMISSIONS.TASK_READ]; // Services typically have limited permissions
      default:
        return [];
    }
  }

  // Middleware for authentication
  authenticateMiddleware() {
    return (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  // Middleware for authorization
  authorizeMiddleware(requiredPermissions) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = requiredPermissions.every(perm => 
        req.user.permissions.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }
}

module.exports = {
  AuthService,
  ROLES,
  PERMISSIONS
};