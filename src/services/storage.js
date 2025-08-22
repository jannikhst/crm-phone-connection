class StorageService {
  constructor() {
    // In-memory storage: userId -> Set of subscriptions
    this.subscriptions = new Map();
  }

  /**
   * Add a subscription for a user
   * @param {string} userId - User identifier
   * @param {Object} subscription - Push subscription object
   */
  addSubscription(userId, subscription) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    
    const userSubscriptions = this.subscriptions.get(userId);
    
    // Convert subscription to string for Set comparison
    const subscriptionKey = JSON.stringify(subscription);
    userSubscriptions.add(subscriptionKey);
    
    console.log(`📱 Added subscription for user ${userId}. Total: ${userSubscriptions.size}`);
  }

  /**
   * Get all subscriptions for a user
   * @param {string} userId - User identifier
   * @returns {Array} Array of subscription objects
   */
  getSubscriptions(userId) {
    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions) {
      return [];
    }
    
    // Convert back from strings to objects
    return Array.from(userSubscriptions).map(sub => JSON.parse(sub));
  }

  /**
   * Remove a subscription for a user
   * @param {string} userId - User identifier
   * @param {Object} subscription - Push subscription object to remove
   */
  removeSubscription(userId, subscription) {
    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions) {
      return;
    }
    
    const subscriptionKey = JSON.stringify(subscription);
    const removed = userSubscriptions.delete(subscriptionKey);
    
    if (removed) {
      console.log(`🗑️  Removed invalid subscription for user ${userId}`);
      
      // Clean up empty user entries
      if (userSubscriptions.size === 0) {
        this.subscriptions.delete(userId);
      }
    }
  }

  /**
   * Get total number of users with subscriptions
   * @returns {number} Number of users
   */
  getUserCount() {
    return this.subscriptions.size;
  }

  /**
   * Get total number of subscriptions across all users
   * @returns {number} Total subscription count
   */
  getTotalSubscriptions() {
    let total = 0;
    for (const userSubs of this.subscriptions.values()) {
      total += userSubs.size;
    }
    return total;
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage statistics
   */
  getStats() {
    return {
      users: this.getUserCount(),
      totalSubscriptions: this.getTotalSubscriptions(),
      avgSubscriptionsPerUser: this.getUserCount() > 0 
        ? (this.getTotalSubscriptions() / this.getUserCount()).toFixed(2)
        : 0
    };
  }
}

export default new StorageService();
