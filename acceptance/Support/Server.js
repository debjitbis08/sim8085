/**
 * Where the system under test listens.
 *
 * Deliberately not Astro's default port: a dev server someone left running
 * points at the development environment, and silently testing against that is
 * worse than not testing at all. Shared with the driver, which opens a second
 * browser context of its own and so cannot inherit the config's baseURL.
 */
export const PORT = 4326;
export const BASE_URL = `http://localhost:${PORT}`;
