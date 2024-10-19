import posthog from 'posthog-js';

export function trackEvent(eventName, data) {
  posthog.capture(eventName, data);
}
