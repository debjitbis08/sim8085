// PostHog is loaded via the snippet in PostHogInitialize.astro, which installs and
// init()s the instance on `window.posthog`. Importing `posthog-js` here instead gives
// a second, never-initialized instance whose capture() calls are silently dropped, so
// always go through the global.
// Pass `{ transport: "sendBeacon" }` as options when the page is about to unload,
// such as on a link click, so the event is not lost with the page.
export function trackEvent(eventName, data, options) {
  if (window.posthog) window.posthog.capture(eventName, data, options);
}
