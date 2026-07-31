// PostHog is loaded via the snippet in PostHogInitialize.astro, which installs and
// init()s the instance on `window.posthog`. Importing `posthog-js` here instead gives
// a second, never-initialized instance whose capture() calls are silently dropped, so
// always go through the global.
export function trackEvent(eventName, data) {
  if (window.posthog) window.posthog.capture(eventName, data);
}
