/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid format
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  
  // Basic phone number validation - allows international format
  // Accepts: +1234567890, +49 123 456789, +1-234-567-8900, etc.
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phoneNumber.trim());
}

/**
 * Middleware to validate required headers
 * @param {string} headerName - Name of required header
 * @returns {Function} Express middleware function
 */
export function requireHeader(headerName) {
  return (req, res, next) => {
    const headerValue = req.get(headerName);
    
    if (!headerValue || headerValue.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Missing required header: ${headerName}`
      });
    }
    
    // Store the header value for use in route handlers
    req.validatedHeaders = req.validatedHeaders || {};
    req.validatedHeaders[headerName] = headerValue.trim();
    
    next();
  };
}

/**
 * Middleware to validate webhook token
 * @param {string} expectedToken - Expected webhook token
 * @returns {Function} Express middleware function
 */
export function validateWebhookToken(expectedToken) {
  return (req, res, next) => {
    const token = req.get('X-Webhook-Token');
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook token'
      });
    }
    
    if (token !== expectedToken) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid webhook token'
      });
    }
    
    next();
  };
}

/**
 * Middleware to validate request body for webhook calls
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function validateCallWebhook(req, res, next) {
  const { owner_user_id, callee_number } = req.body;
  
  // Validate required fields
  if (!owner_user_id || typeof owner_user_id !== 'string' || owner_user_id.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid owner_user_id'
    });
  }
  
  if (!callee_number || typeof callee_number !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid callee_number'
    });
  }
  
  // Validate phone number format
  if (!isValidPhoneNumber(callee_number)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid phone number format'
    });
  }
  
  // Store validated data
  req.validatedData = {
    userId: owner_user_id.trim(),
    phoneNumber: callee_number.trim()
  };
  
  next();
}

/**
 * Middleware to validate push subscription data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function validateSubscription(req, res, next) {
  const subscription = req.body;
  
  // Validate subscription structure
  if (!subscription || typeof subscription !== 'object') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid subscription data'
    });
  }
  
  // Check required fields
  if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid endpoint'
    });
  }
  
  if (!subscription.keys || typeof subscription.keys !== 'object') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid keys'
    });
  }
  
  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required keys (p256dh, auth)'
    });
  }
  
  next();
}
