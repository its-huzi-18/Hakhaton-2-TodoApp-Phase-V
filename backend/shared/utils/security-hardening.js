// Security hardening for Advanced Cloud Deployment

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const validator = require('validator');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 1. Helmet security middleware configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      connectSrc: ["'self'", "api.example.com"],
      frameAncestors: ["'none'"] // Prevent clickjacking
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'same-origin'
  }
});

// 2. Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More restrictive rate limiting for sensitive endpoints
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per window for sensitive endpoints
  skipSuccessfulRequests: true, // Only count failed requests
  message: {
    error: 'Too many requests for this sensitive operation, please try again later.'
  }
});

// Slow down requests for brute force protection
const bruteForceLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Begin slowing down after 5 requests
  delayMs: 500, // Slow down by 500ms per request after the 5th
  maxDelayMs: 10000, // Cap the delay at 10 seconds
});

// 3. Input validation and sanitization
const validateTaskInput = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .customSanitizer(value => validator.escape(value)),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .customSanitizer(value => validator.escape(value)),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .customSanitizer(value => new Date(value)),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with max 10 items')
    .customSanitizer(value => {
      if (Array.isArray(value)) {
        return value.map(tag => validator.escape(tag.toString().trim())).filter(tag => tag.length > 0);
      }
      return [];
    }),
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, completed, cancelled')
];

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// 4. Authentication and authorization middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authorization middleware for specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// 5. Secure session management
const sessionConfig = {
  secret: process.env.SESSION_SECRET || generateSecureSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
};

// Generate a secure random secret
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// 6. SQL injection prevention through parameterized queries
const dbSecurity = {
  // Example of parameterized query implementation
  async createTaskSecure(params) {
    // In a real implementation, this would use a parameterized query
    // Example with pg library:
    // const query = 'INSERT INTO tasks(title, description, due_date, priority, user_id) VALUES($1, $2, $3, $4, $5) RETURNING *';
    // return await db.query(query, [params.title, params.description, params.dueDate, params.priority, params.userId]);
    
    // For demonstration purposes only - in real implementation, use parameterized queries
    return { id: 'mock-task-id', ...params };
  },
  
  async getTasksSecure(userId, filters = {}) {
    // Example of secure parameterized query
    // const query = 'SELECT * FROM tasks WHERE user_id = $1';
    // const params = [userId];
    // let queryTail = '';
    
    // if (filters.status) {
    //   queryTail += ' AND status = $2';
    //   params.push(filters.status);
    // }
    
    // return await db.query(query + queryTail, params);
    
    // For demonstration purposes only
    return [{ id: 'mock-task-id', userId, ...filters }];
  }
};

// 7. Secure file upload handling (if applicable)
const secureFileUpload = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  uploadPath: './uploads',
  
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.maxFileSize} bytes`);
    }
    
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }
    
    // Additional security checks could go here
    // e.g., virus scanning, content inspection, etc.
    
    return true;
  }
};

// 8. CORS security configuration
const corsOptions = {
  origin: function (origin, callback) {
    // In production, specify exact origins instead of wildcard
    if (process.env.NODE_ENV !== 'production') {
      // Allow all origins in development
      callback(null, true);
      return;
    }
    
    // In production, only allow specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['https://yourdomain.com'];
      
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// 9. Security audit logging
const securityLogger = {
  logSuspiciousActivity: (req, res, activityType, details) => {
    console.log({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      type: 'SECURITY_AUDIT',
      activityType,
      details,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user ? req.user.id : 'anonymous',
      correlationId: req.headers['x-correlation-id'] || 'unknown'
    });
  },
  
  logAuthFailure: (req, failureType, details) => {
    console.log({
      timestamp: new Date().toISOString(),
      level: 'ALERT',
      type: 'AUTH_FAILURE',
      failureType,
      details,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId: req.headers['x-correlation-id'] || 'unknown'
    });
  }
};

// 10. Environment-specific security configurations
const securityConfig = {
  development: {
    // Less restrictive settings for development
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // Higher limit for development
    },
    hsts: false, // Don't force HTTPS in development
    cors: {
      origin: '*', // Allow all origins in development
      credentials: false
    }
  },
  
  production: {
    // Strict security settings for production
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Lower limit for production
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['https://yourdomain.com'],
      credentials: true
    }
  }
};

// 11. Security middleware bundle
const securityMiddleware = {
  applySecurity: (app) => {
    // Apply security headers
    app.use(securityHeaders);
    
    // Apply rate limiting
    app.use('/api/', apiLimiter);
    app.use('/api/auth/', sensitiveEndpointLimiter);
    app.use(bruteForceLimiter);
    
    // Apply CORS if needed
    if (process.env.NODE_ENV === 'production') {
      const cors = require('cors');
      app.use(cors(corsOptions));
    }
    
    // Input validation middleware
    app.use(express.json({ 
      limit: '10mb' // Limit request size
    }));
    
    // Authentication middleware for protected routes
    app.use('/api/protected', authenticateToken);
    
    return app;
  }
};

// Export security components
module.exports = {
  securityHeaders,
  apiLimiter,
  sensitiveEndpointLimiter,
  bruteForceLimiter,
  validateTaskInput,
  handleValidationErrors,
  authenticateToken,
  requirePermission,
  sessionConfig,
  dbSecurity,
  secureFileUpload,
  corsOptions,
  securityLogger,
  securityConfig,
  securityMiddleware
};