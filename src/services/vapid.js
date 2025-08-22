import webpush from 'web-push';
import crypto from 'crypto';

class VapidService {
  constructor() {
    this.publicKey = null;
    this.privateKey = null;
    this.adminEmail = null;
  }

  initialize(adminEmail) {
    this.adminEmail = adminEmail;
    
    // Try to load from environment variables
    this.publicKey = process.env.VAPID_PUBLIC_KEY;
    this.privateKey = process.env.VAPID_PRIVATE_KEY;

    // Generate new keys if not provided
    if (!this.publicKey || !this.privateKey) {
      console.log('🔑 VAPID keys not found in environment, generating new ones...');
      const vapidKeys = webpush.generateVAPIDKeys();
      this.publicKey = vapidKeys.publicKey;
      this.privateKey = vapidKeys.privateKey;
      
      // Log the keys once for manual addition to .env
      console.log('📋 Add these VAPID keys to your .env file:');
      console.log(`VAPID_PUBLIC_KEY=${this.publicKey}`);
      console.log(`VAPID_PRIVATE_KEY=${this.privateKey}`);
      console.log('⚠️  These keys will be regenerated on each restart until added to .env');
    } else {
      console.log('✅ VAPID keys loaded from environment');
    }

    // Configure web-push
    webpush.setVapidDetails(
      `mailto:${this.adminEmail}`,
      this.publicKey,
      this.privateKey
    );
  }

  getPublicKey() {
    return this.publicKey;
  }

  getWebPushInstance() {
    return webpush;
  }
}

export default new VapidService();
