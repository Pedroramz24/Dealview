import { toast } from 'sonner';

/**
 * Smart toast utility that prevents duplicate toast notifications
 * within a short time window (default 2 seconds)
 * 
 * Usage:
 * import { smartToast } from '../utils/smartToast';
 * 
 * smartToast.success('Contact created successfully');
 * smartToast.error('Failed to save contact');
 */

class SmartToast {
  constructor() {
    this.recentToasts = new Map(); // message -> timestamp
    this.dedupeWindow = 2000; // 2 seconds
  }

  _shouldShow(message) {
    const now = Date.now();
    const lastShown = this.recentToasts.get(message);
    
    if (lastShown && (now - lastShown) < this.dedupeWindow) {
      console.log(`[SmartToast] Suppressing duplicate toast: "${message}"`);
      return false;
    }
    
    this.recentToasts.set(message, now);
    
    // Cleanup old entries (older than dedupeWindow)
    for (const [msg, timestamp] of this.recentToasts.entries()) {
      if (now - timestamp > this.dedupeWindow) {
        this.recentToasts.delete(msg);
      }
    }
    
    return true;
  }

  success(message, options = {}) {
    if (this._shouldShow(message)) {
      toast.dismiss();
      toast.success(message, { duration: 3000, ...options });
    }
  }

  error(message, options = {}) {
    if (this._shouldShow(message)) {
      toast.dismiss();
      toast.error(message, { duration: 3000, ...options });
    }
  }

  warning(message, options = {}) {
    if (this._shouldShow(message)) {
      toast.dismiss();
      toast.warning(message, { duration: 3000, ...options });
    }
  }

  info(message, options = {}) {
    if (this._shouldShow(message)) {
      toast.dismiss();
      toast.info(message, { duration: 3000, ...options });
    }
  }

  // Direct access to toast.dismiss for manual control
  dismiss() {
    toast.dismiss();
  }
}

export const smartToast = new SmartToast();
