// Sentry Crash Reporting & Telemetry Logging Integration for Capacitor (iOS/Android/Web)
import * as Sentry from '@sentry/capacitor';

// Sentry DSN loaded from environment (.env) or runtime window config
const DEFAULT_SENTRY_DSN = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SENTRY_DSN)
  || (typeof window !== 'undefined' && window.__SENTRY_DSN__)
  || '';

class Logger {
  constructor() {
    this.initialized = false;
    this.dsn = DEFAULT_SENTRY_DSN;
    this.init(this.dsn);
  }

  init(dsn) {
    if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') {
      console.log('ℹ️ [Sentry] Running in local log mode. Provide your Sentry DSN to forward remote events.');
      return;
    }

    try {
      Sentry.init({
        dsn: dsn.trim(),
        integrations: [
          Sentry.browserTracingIntegration()
        ],
        // Performance Monitoring & Tracing
        tracesSampleRate: 1.0,
        enableNative: true,
        environment: window.location.hostname === 'localhost' ? 'development' : 'production'
      });
      this.initialized = true;
      console.log('✅ [Sentry] Successfully initialized Sentry Capacitor (Native iOS/Android + Web).');
    } catch (err) {
      console.warn('⚠️ [Sentry] Failed to initialize Sentry:', err);
    }
  }

  // Set game mode / session tags
  setTag(key, value) {
    if (this.initialized) {
      Sentry.setTag(key, value);
    }
  }

  // Log informational breadcrumb
  info(category, message, data = {}) {
    console.log(`[${category}] ${message}`, data);
    if (this.initialized) {
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info'
      });
    }
  }

  // Log tactical warnings (e.g., camp detection, barrage, stuck tank)
  warn(category, message, data = {}) {
    console.warn(`[${category}] ${message}`, data);
    if (this.initialized) {
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'warning'
      });
    }
  }

  // Record major gameplay milestones (Game start, Wave milestone, Victory, Game over)
  event(name, params = {}) {
    this.info('gameplay', `Event: ${name}`, params);
    if (this.initialized) {
      Sentry.captureMessage(`Game Event: ${name}`, {
        level: 'info',
        extra: params
      });
    }
  }

  // Capture runtime exceptions
  error(error, context = {}) {
    console.error('[Error]', error, context);
    if (this.initialized) {
      Sentry.captureException(error, { extra: context });
    }
  }
}

export const logger = new Logger();
