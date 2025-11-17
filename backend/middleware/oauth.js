// OAuth error handling middleware
export const handleOAuthError = (error, req, res, next) => {
  console.error('OAuth Error:', error);

  // Handle specific OAuth errors
  if (error.message.includes('invalid_grant')) {
    return res.status(401).json({
      error: 'Authentication expired',
      code: 'OAUTH_EXPIRED',
      message: 'Please sign in again'
    });
  }

  if (error.message.includes('access_denied')) {
    return res.status(403).json({
      error: 'Access denied',
      code: 'OAUTH_DENIED',
      message: 'OAuth access was denied'
    });
  }

  if (error.message.includes('invalid_request')) {
    return res.status(400).json({
      error: 'Invalid request',
      code: 'OAUTH_INVALID_REQUEST',
      message: 'OAuth request is invalid'
    });
  }

  // Default OAuth error
  res.status(500).json({
    error: 'OAuth authentication failed',
    code: 'OAUTH_ERROR',
    message: error.message
  });
};

// Rate limiting for OAuth endpoints
export const oauthRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting (use Redis in production)
  const key = `oauth_${req.ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  if (!global.oauthAttempts) {
    global.oauthAttempts = new Map();
  }

  const attempts = global.oauthAttempts.get(key) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many OAuth attempts',
      message: 'Please try again later'
    });
  }

  recentAttempts.push(now);
  global.oauthAttempts.set(key, recentAttempts);
  next();
};