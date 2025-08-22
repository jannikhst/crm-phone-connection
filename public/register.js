class PushRegistration {
  constructor() {
    this.form = document.getElementById('registrationForm');
    this.userIdInput = document.getElementById('userId');
    this.enableButton = document.getElementById('enableButton');
    this.statusDiv = document.getElementById('status');
    
    this.init();
  }

  init() {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      this.showStatus('error', 'Service Workers are not supported in this browser');
      this.enableButton.disabled = true;
      return;
    }

    // Check if push messaging is supported
    if (!('PushManager' in window)) {
      this.showStatus('error', 'Push messaging is not supported in this browser');
      this.enableButton.disabled = true;
      return;
    }

    // Load saved user ID
    const savedUserId = localStorage.getItem('crm-push-user-id');
    if (savedUserId) {
      this.userIdInput.value = savedUserId;
    }

    // Check current registration status
    this.checkRegistrationStatus();

    // Bind form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegistration();
    });
  }

  async checkRegistrationStatus() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          this.showStatus('success', '✅ Push notifications are already enabled for this device');
          this.enableButton.textContent = '🔄 Re-register Push Notifications';
        }
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  }

  async handleRegistration() {
    const userId = this.userIdInput.value.trim();
    
    if (!userId) {
      this.showStatus('error', 'Please enter your User ID');
      return;
    }

    // Save user ID
    localStorage.setItem('crm-push-user-id', userId);

    this.enableButton.disabled = true;
    this.enableButton.textContent = '⏳ Registering...';
    this.showStatus('info', 'Setting up push notifications...');

    try {
      // Step 1: Register service worker
      await this.registerServiceWorker();
      
      // Step 2: Get VAPID public key
      const publicKey = await this.getVapidPublicKey();
      
      // Step 3: Subscribe to push notifications
      const subscription = await this.subscribeToPush(publicKey);
      
      // Step 4: Send subscription to server
      await this.sendSubscriptionToServer(userId, subscription);
      
      this.showStatus('success', '🎉 Push notifications enabled successfully! You will now receive CRM call notifications.');
      this.enableButton.textContent = '✅ Notifications Enabled';
      
    } catch (error) {
      console.error('Registration failed:', error);
      this.showStatus('error', `Registration failed: ${error.message}`);
      this.enableButton.textContent = '🔔 Enable Push Notifications';
    } finally {
      this.enableButton.disabled = false;
    }
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      throw new Error(`Service Worker registration failed: ${error.message}`);
    }
  }

  async getVapidPublicKey() {
    try {
      const response = await fetch('/api/vapid-public-key');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      throw new Error(`Failed to get VAPID key: ${error.message}`);
    }
  }

  async subscribeToPush(publicKey) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Using existing subscription');
        return subscription;
      }

      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      console.log('New subscription created');
      return subscription;
      
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Push notifications permission denied. Please allow notifications and try again.');
      } else if (error.name === 'AbortError') {
        throw new Error('Push subscription was cancelled. Please try again.');
      } else {
        throw new Error(`Push subscription failed: ${error.message}`);
      }
    }
  }

  async sendSubscriptionToServer(userId, subscription) {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Subscription sent to server:', result);
      
    } catch (error) {
      throw new Error(`Failed to register with server: ${error.message}`);
    }
  }

  // Convert VAPID public key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  showStatus(type, message) {
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.textContent = message;
    this.statusDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.statusDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PushRegistration();
});
