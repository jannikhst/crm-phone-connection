import vapidService from './vapid.js';
import storageService from './storage.js';

class PushService {
  /**
   * Send push notification to all subscriptions of a user
   * @param {string} userId - User identifier
   * @param {Object} payload - Notification payload
   * @returns {Object} Result with sent and total counts
   */
  async sendToUser(userId, payload) {
    const subscriptions = storageService.getSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      console.log(`⚠️  No subscriptions found for user ${userId}`);
      return { sent: 0, total: 0 };
    }

    console.log(`📤 Sending push to ${subscriptions.length} subscription(s) for user ${userId}`);
    
    const webpush = vapidService.getWebPushInstance();
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        this.sendNotification(webpush, subscription, payload, userId)
      )
    );

    // Count successful sends and handle failures
    let sent = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        console.error(`❌ Failed to send to subscription ${index + 1}:`, result.reason.message);
        
        // Remove invalid subscriptions (410 Gone, 400 Bad Request)
        if (result.reason.statusCode === 410 || result.reason.statusCode === 400) {
          storageService.removeSubscription(userId, subscriptions[index]);
        }
      }
    });

    console.log(`✅ Successfully sent ${sent}/${subscriptions.length} notifications to user ${userId}`);
    
    return {
      sent,
      total: subscriptions.length
    };
  }

  /**
   * Send notification to a single subscription
   * @param {Object} webpush - Web push instance
   * @param {Object} subscription - Push subscription
   * @param {Object} payload - Notification payload
   * @param {string} userId - User identifier for logging
   */
  async sendNotification(webpush, subscription, payload, userId) {
    const options = {
      TTL: 3600, // 1 hour
      urgency: 'high'
    };

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), options);
    } catch (error) {
      // Re-throw with additional context
      error.userId = userId;
      throw error;
    }
  }

  /**
   * Create notification payload for phone call
   * @param {string} calleeNumber - Phone number to call
   * @param {string} baseUrl - Base URL for the call page
   * @returns {Object} Notification payload
   */
  createCallPayload(calleeNumber, baseUrl) {
    return {
      title: '📞 Incoming CRM Call',
      body: `Tap to call ${calleeNumber}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'crm-call',
      requireInteraction: true,
      actions: [
        {
          action: 'call',
          title: 'Call Now'
        }
      ],
      data: {
        url: `${baseUrl}/call?to=${encodeURIComponent(calleeNumber)}`,
        calleeNumber
      }
    };
  }
}

export default new PushService();
