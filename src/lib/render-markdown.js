import { marked } from "marked";
import DOMPurify from "dompurify";

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Renders model output as sanitized HTML.
 *
 * Model responses echo back user-supplied assembly, so the text is not trusted
 * even though it arrives from our own API route — sanitize before it reaches
 * innerHTML.
 */
export function renderMarkdown(text) {
    if (!text) return "";

    // DOMPurify needs a DOM, which does not exist during SSR. Rather than
    // emitting unsanitized HTML, degrade to escaped plain text — these
    // components render their content on the client anyway.
    if (typeof window === "undefined" || typeof DOMPurify.sanitize !== "function") {
        return escapeHtml(text);
    }

    const html = marked.parse(text, { async: false, breaks: true, gfm: true });

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "code",
            "pre",
            "ul",
            "ol",
            "li",
            "h1",
            "h2",
            "h3",
            "h4",
            "blockquote",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "hr",
            "a",
        ],
        ALLOWED_ATTR: ["href", "title"],
        // Defence in depth: no javascript:/data: URLs even on allowed anchors.
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
    });
}
