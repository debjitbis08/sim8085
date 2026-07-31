// @vitest-environment jsdom
import { test, expect } from "vitest";
import { renderMarkdown } from "../lib/render-markdown.js";

test("renders markdown", () => {
  const html = renderMarkdown("Use **MVI**:\n\n```asm\nMVI A,30H\n```\n\n- one\n- two");
  expect(html).toContain("<strong>MVI</strong>");
  expect(html).toContain("<pre>");
  expect(html).toContain("<li>one</li>");
});

test("strips script and event handlers", () => {
  const html = renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)">');
  expect(html).not.toContain("script");
  expect(html).not.toContain("onerror");
});

test("strips javascript: urls", () => {
  expect(renderMarkdown("[click](javascript:alert(1))")).not.toContain("javascript:");
});

test("no-DOM (SSR) path escapes instead of throwing or emitting raw HTML", async () => {
    // Re-import in a DOM-less context to exercise the SSR branch.
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
        process.execPath,
        [
            "--input-type=module",
            "-e",
            "import{renderMarkdown as r}from'./src/lib/render-markdown.js';process.stdout.write(r('**hi** <script>alert(1)</script>'))",
        ],
        { encoding: "utf8" },
    );
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
});

test("empty input is safe", () => {
  expect(renderMarkdown("")).toBe("");
  expect(renderMarkdown(undefined)).toBe("");
});
