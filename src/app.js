import express from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Services
import vapidService from './services/vapid.js';
import storageService from './services/storage.js';
import pushService from './services/push.js';

// Middleware
import {
  requireHeader,
  validateWebhookToken,
  validateCallWebhook,
  validateSubscription
} from './middleware/validation.js';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'default-webhook-token';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

// Initialize VAPID service
vapidService.initialize(ADMIN_EMAIL);

// Trust proxy configuration for rate limiting and X-Forwarded-* headers
// This is needed when running behind reverse proxies (Docker, nginx, etc.)
app.set('trust proxy', true);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = storageService.getStats();
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: stats
  });
});

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: vapidService.getPublicKey()
  });
});

// Register device for push notifications
app.post('/api/devices', 
  requireHeader('X-User-Id'),
  validateSubscription,
  (req, res) => {
    try {
      const userId = req.validatedHeaders['X-User-Id'];
      const subscription = req.body;
      
      storageService.addSubscription(userId, subscription);
      
      res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        userId
      });
    } catch (error) {
      console.error('❌ Error registering device:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register device'
      });
    }
  }
);

// Webhook endpoint for CRM calls
app.post('/webhooks/call',
  webhookLimiter,
  validateWebhookToken(WEBHOOK_TOKEN),
  validateCallWebhook,
  async (req, res) => {
    try {
      const { userId, phoneNumber } = req.validatedData;
      
      // Get base URL for the call page
      const protocol = req.get('X-Forwarded-Proto') || req.protocol;
      const host = req.get('Host');
      const baseUrl = `${protocol}://${host}`;
      
      // Create notification payload
      const payload = pushService.createCallPayload(phoneNumber, baseUrl);
      
      // Send push notification
      const result = await pushService.sendToUser(userId, payload);
      
      console.log(`📞 Webhook processed: ${phoneNumber} for user ${userId}`);
      
      res.json({
        success: true,
        message: 'Push notification sent',
        userId,
        phoneNumber,
        sent: result.sent,
        total: result.total
      });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process webhook'
      });
    }
  }
);

// Call page - redirects to phone dialer
app.get('/call', (req, res) => {
  const phoneNumber = req.query.to;
  
  if (!phoneNumber) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Call Error</title>
      </head>
      <body>
        <h1>❌ Error</h1>
        <p>Missing phone number parameter</p>
        <a href="/">← Back to Home</a>
      </body>
      </html>
    `);
  }
  
  // Clean phone number for tel: link
  const cleanNumber = phoneNumber.replace(/[^\d\+\-\(\)\s]/g, '');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Calling ${cleanNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 2rem;
          background: #f5f5f5;
        }
        .call-container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
          margin: 0 auto;
        }
        .phone-number {
          font-size: 1.5rem;
          font-weight: bold;
          color: #007AFF;
          margin: 1rem 0;
        }
        .call-button {
          display: inline-block;
          background: #007AFF;
          color: white;
          text-decoration: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          margin: 1rem 0;
        }
        .status {
          color: #666;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="call-container">
        <h1>📞 Calling</h1>
        <div class="phone-number">${cleanNumber}</div>
        <a href="tel:${cleanNumber}" class="call-button">📱 Call Now</a>
        <div class="status">
          <p>If the call doesn't start automatically, tap the button above.</p>
          <a href="/">← Back to Home</a>
        </div>
      </div>
      
      <script>
        // Immediately redirect to phone dialer
        window.location.href = "tel:${cleanNumber}";
      </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CRM Mobile Push server running on port ${PORT}`);
  console.log(`📱 Registration page: http://localhost:${PORT}/`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Webhook token: ${WEBHOOK_TOKEN}`);
  
  if (WEBHOOK_TOKEN === 'default-webhook-token') {
    console.log('⚠️  Using default webhook token. Set WEBHOOK_TOKEN in .env for production!');
  }
});
