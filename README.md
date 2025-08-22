# CRM Mobile Push Notification MVP

A minimal Node.js Express application that receives CRM webhooks and sends push notifications to mobile devices, enabling instant phone dialing for sales teams.

## Features

- 📱 Web Push Notifications with VAPID authentication
- 🔗 Direct phone dialer integration (`tel:` links)
- 🚀 Single Express app serving both frontend and API
- 🐳 Docker containerization with external network support
- 🔒 Webhook security with token validation
- 📊 In-memory storage with clean interface for future database migration
- 🛡️ Rate limiting and input validation
- 📞 Automatic phone number cleanup and validation

## Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   WEBHOOK_TOKEN=your-secure-token-here
   ADMIN_EMAIL=admin@yourdomain.com
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the registration page:**
   Open http://localhost:3000 in your browser

5. **Register for push notifications:**
   - Enter your User ID (matches CRM system)
   - Click "Enable Push Notifications"
   - Allow notifications when prompted

### Docker Deployment

#### Option 1: Use Pre-built Image from GitHub Container Registry

1. **Update compose.yaml to use the published image:**
   ```yaml
   services:
     app:
       image: ghcr.io/your-username/crm-mobile-push:latest
       # Remove the 'build: .' line
   ```

2. **Start with Docker Compose:**
   ```bash
   docker compose up -d
   ```

#### Option 2: Build Locally

1. **Build and start with Docker Compose:**
   ```bash
   docker compose up -d
   ```

2. **Check application health:**
   ```bash
   curl http://localhost:3000/health
   ```

#### Available Docker Images

The application is automatically built and published to GitHub Container Registry:
- `ghcr.io/your-username/crm-mobile-push:latest` - Latest main branch
- `ghcr.io/your-username/crm-mobile-push:v1.0.0` - Specific version tags
- Multi-architecture support: `linux/amd64` and `linux/arm64`

## API Endpoints

### Health Check
```http
GET /health
```
Returns application status and storage statistics.

### Get VAPID Public Key
```http
GET /api/vapid-public-key
```
Returns the VAPID public key for push subscription.

### Register Device
```http
POST /api/devices
Headers:
  X-User-Id: user-identifier
  Content-Type: application/json

Body: Push subscription object from browser
```

### CRM Webhook
```http
POST /webhooks/call
Headers:
  X-Webhook-Token: your-webhook-token
  Content-Type: application/json

Body:
{
  "owner_user_id": "sales-001",
  "callee_number": "+1234567890"
}
```

### Call Page
```http
GET /call?to=PHONE_NUMBER
```
Redirects immediately to `tel:PHONE_NUMBER` and shows fallback UI.

## Testing the Webhook

Use curl to test the webhook endpoint:

```bash
curl -X POST http://localhost:3000/webhooks/call \
  -H "X-Webhook-Token: your-webhook-token" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_user_id": "sales-001",
    "callee_number": "+1234567890"
  }'
```

## iOS Web Push Requirements

For push notifications to work on iOS devices:

### Prerequisites
- **iOS 16.4 or later**
- **Safari browser** (Chrome/Firefox not supported)
- **HTTPS connection** (required for service workers)

### Setup Steps for iOS Users
1. Open the registration page in Safari
2. **Add to Home Screen:**
   - Tap the Share button (square with arrow)
   - Select "Add to Home Screen"
   - Confirm the installation
3. **Open from Home Screen:**
   - Launch the app from the home screen icon (not Safari)
   - This runs it as a PWA (Progressive Web App)
4. **Enable Notifications:**
   - Enter your User ID
   - Tap "Enable Push Notifications"
   - Allow notifications when prompted

### iOS Limitations
- Notifications only work when added to home screen
- Limited notification payload size
- Requires user interaction for permission
- May have delivery delays compared to native apps

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CRM System    │───▶│  Express Server  │───▶│  Mobile Device  │
│                 │    │                  │    │                 │
│ Sends Webhook   │    │ • Validates      │    │ • Receives Push │
│ with User ID    │    │ • Stores Subs    │    │ • Opens Dialer  │
│ and Phone #     │    │ • Sends Push     │    │ • Calls Number  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

- **Express Server**: Handles API endpoints and serves static files
- **VAPID Service**: Manages Web Push authentication keys
- **Storage Service**: In-memory subscription management
- **Push Service**: Sends notifications with phone number data
- **Service Worker**: Handles push events and notification clicks
- **Frontend**: Registration UI and push subscription logic

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `WEBHOOK_TOKEN` | Security token for webhook endpoint | `default-webhook-token` |
| `ADMIN_EMAIL` | Email for VAPID configuration | `admin@example.com` |
| `VAPID_PUBLIC_KEY` | VAPID public key (auto-generated if empty) | - |
| `VAPID_PRIVATE_KEY` | VAPID private key (auto-generated if empty) | - |

## Security Features

- **Webhook Token Validation**: Required `X-Webhook-Token` header
- **Rate Limiting**: 10 requests/minute on webhook endpoint
- **Input Validation**: Phone number format validation
- **Header Requirements**: User ID required for device registration
- **HTTPS Enforcement**: Service workers require secure context

## Storage

Currently uses in-memory storage for push subscriptions. The storage service provides a clean interface that can be easily replaced with SQLite or other databases:

```javascript
// Current: In-memory
storageService.addSubscription(userId, subscription);

// Future: Database
// Same interface, different implementation
```

## Monitoring

The application provides detailed console logging:

- 🚀 Server startup information
- 🔑 VAPID key generation (one-time display)
- 📱 Device registration events
- 📤 Push notification sending
- ❌ Error handling and cleanup
- 🗑️ Invalid subscription removal

## CI/CD Pipeline

The project includes a GitHub Actions workflow that automatically:

- **Builds Docker images** on push to `main` and `develop` branches
- **Publishes to GitHub Container Registry** (ghcr.io)
- **Supports multi-architecture builds** (AMD64 and ARM64)
- **Creates version tags** from Git tags (e.g., `v1.0.0`)
- **Generates build attestations** for security

### Triggering Builds

- **Push to main/develop**: Creates `latest` and branch-specific tags
- **Create Git tag**: Creates version-specific tags (e.g., `git tag v1.0.0 && git push --tags`)
- **Pull requests**: Builds but doesn't push (for testing)

### Using Published Images

```bash
# Pull the latest image
docker pull ghcr.io/your-username/crm-mobile-push:latest

# Run directly
docker run -p 3000:3000 --env-file .env ghcr.io/your-username/crm-mobile-push:latest

# Use in compose.yaml
services:
  app:
    image: ghcr.io/your-username/crm-mobile-push:latest
```

## Development

### Project Structure
```
crm-mobile-push/
├── src/
│   ├── app.js              # Main Express application
│   ├── services/
│   │   ├── vapid.js        # VAPID key management
│   │   ├── storage.js      # Subscription storage
│   │   └── push.js         # Push notification service
│   └── middleware/
│       └── validation.js   # Request validation
├── public/
│   ├── index.html          # Registration page
│   ├── register.js         # Frontend logic
│   └── sw.js              # Service worker
├── Dockerfile
├── compose.yaml
└── .env.example
```

### Dependencies
- `express`: Web framework
- `web-push`: Push notification library
- `dotenv`: Environment variable management
- `express-rate-limit`: Rate limiting middleware

## Troubleshooting

### Common Issues

1. **Push notifications not working:**
   - Check browser console for errors
   - Verify HTTPS connection
   - Ensure notifications are allowed
   - For iOS: Must be added to home screen

2. **Webhook returns 403 Forbidden:**
   - Check `X-Webhook-Token` header
   - Verify token matches `.env` configuration

3. **Phone dialer not opening:**
   - Verify phone number format
   - Check device supports `tel:` links
   - Some browsers may block automatic redirects

4. **VAPID keys regenerating:**
   - Add generated keys to `.env` file
   - Keys are logged once on first startup
