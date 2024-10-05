import posthog from 'posthog-js';

export function trackEvent(eventName, details) {
  posthog.capture(eventName, details);
}
