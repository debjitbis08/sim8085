/**
 * Access control for paid practice problems.
 *
 * HONEST LABEL: `seal` is obfuscation, not encryption. The payload is
 * base64-encoded JSON sitting in a static bundle; anyone who opens devtools
 * and decodes it gets the content. It exists to stop casual copy-paste and to
 * keep paid briefs out of plain view — nothing stronger.
 *
 * That is a deliberate trade. Serving paid steps from an SSR endpoint is the
 * real fix, and it costs a round trip plus offline support for those steps.
 * Until there is evidence of actual tampering, this is the cheaper side of the
 * trade. When it becomes worth changing, `loadStep` in content.js is the only
 * function that has to move — the panel already treats the payload as opaque
 * until it is entitled to it.
 *
 * What sealing does buy, and what plain props would not: because Astro
 * server-renders islands, an unsealed brief would appear verbatim in the
 * static HTML of every paid step. Sealing keeps it out of the page source and
 * out of search engine indexes.
 */

const PLUS_TIER = "PLUS";

/** Free problems are open to everyone; paid ones need an active Plus tier. */
export function canAccess(access, tier) {
    if (access !== "plus") return true;
    return tier === PLUS_TIER;
}

// --- base64 that works both at build time (Node) and in the browser ---------

function toBase64(bytes) {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64(text) {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(text, "base64"));
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Encode a payload for shipping to the client. Briefs contain em dashes and
 * other non-ASCII, so the JSON is UTF-8 encoded before base64 rather than
 * relying on btoa's latin1-only behaviour.
 */
export function seal(payload) {
    return toBase64(new TextEncoder().encode(JSON.stringify(payload)));
}

export function unseal(sealed) {
    return JSON.parse(new TextDecoder().decode(fromBase64(sealed)));
}
