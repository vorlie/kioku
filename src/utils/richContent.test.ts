import test from "node:test";
import assert from "node:assert/strict";
import { MAX_CONTENT_LENGTH, parseRichContent, type RichNode } from "./richContent.ts";
import { sanitizeExternalUrl, sanitizeImageUrl } from "./safeUrl.ts";

function flattenText(nodes: RichNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "code") return node.value;
      if (node.type === "break") return "\n";
      if (node.type === "image") return `[IMG:${node.src}]`;
      return flattenText(node.children);
    })
    .join("");
}

function findNodes(nodes: RichNode[], predicate: (node: RichNode) => boolean): RichNode[] {
  const matches: RichNode[] = [];
  for (const node of nodes) {
    if (predicate(node)) matches.push(node);
    if ("children" in node) {
      matches.push(...findNodes(node.children, predicate));
    }
  }
  return matches;
}

test("rejects dangerous link protocols and obfuscated URLs", () => {
  assert.equal(sanitizeExternalUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeExternalUrl("java\tscript:alert(1)"), null);
  assert.equal(sanitizeExternalUrl("vbscript:msgbox(1)"), null);
  assert.equal(sanitizeExternalUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(sanitizeExternalUrl("file:///etc/passwd"), null);
  assert.equal(sanitizeExternalUrl("//evil.example/phish"), null);
  assert.equal(sanitizeExternalUrl("https://anilist.co/anime/1"), "https://anilist.co/anime/1");
  assert.equal(sanitizeExternalUrl("http://example.com/path"), "http://example.com/path");
});

test("rejects SVG and non-HTTPS image URLs", () => {
  assert.equal(sanitizeImageUrl("http://example.com/a.png"), null);
  assert.equal(sanitizeImageUrl("https://example.com/payload.svg"), null);
  assert.equal(sanitizeImageUrl("https://example.com/payload.SVGZ?x=1"), null);
  assert.equal(sanitizeImageUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(sanitizeImageUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeImageUrl("https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/1.jpg"), "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/1.jpg");
});

test("strips script tags, inline event handlers, and SVG payloads in basic HTML mode", () => {
  const payload =
    'Hello <script>alert(1)</script><img src=x onerror="alert(2)"><svg onload="alert(3)"></svg><b>bold</b><a href="javascript:alert(4)" onclick="alert(5)">bad</a>';
  const { nodes } = parseRichContent(payload, { allowBasicHtml: true });
  const text = flattenText(nodes);

  assert.ok(text.includes("Hello"));
  assert.ok(text.includes("bold"));
  assert.ok(text.includes("bad"));
  assert.ok(!text.includes("onerror"));
  assert.ok(!text.includes("onload"));
  assert.equal(findNodes(nodes, (n) => n.type === "link").length, 0);
  assert.equal(findNodes(nodes, (n) => n.type === "image").length, 0);
});

test("renders raw HTML inertly when allowBasicHtml is false", () => {
  const payload = 'Text with <script>alert(1)</script> and <img src="x" onerror="alert(1)">';
  const { nodes } = parseRichContent(payload, { allowBasicHtml: false });
  const text = flattenText(nodes);
  assert.ok(text.includes("<script>alert(1)</script>"));
  assert.equal(findNodes(nodes, (n) => n.type === "image").length, 0);
});

test("neutralizes javascript: links and SVG images inside Markdown", () => {
  const payload =
    "[click](javascript:alert(1)) [ok](https://anilist.co) ![svg](https://evil.com/x.svg) img(https://evil.com/y.svg) img(https://cdn.example.com/pic.png)";
  const { nodes } = parseRichContent(payload);
  const links = findNodes(nodes, (n) => n.type === "link");
  const images = findNodes(nodes, (n) => n.type === "image");

  assert.equal(links.length, 1);
  assert.equal((links[0] as Extract<RichNode, { type: "link" }>).href, "https://anilist.co/");
  assert.equal(images.length, 1);
  assert.equal((images[0] as Extract<RichNode, { type: "image" }>).src, "https://cdn.example.com/pic.png");
});

test("handles nested and malformed spoiler markup safely", () => {
  const { nodes: nested } = parseRichContent("~!outer **bold**!~ and ~!unclosed spoiler");
  const spoilers = findNodes(nested, (n) => n.type === "spoiler");
  assert.equal(spoilers.length, 1);
  assert.ok(flattenText(nested).includes("unclosed spoiler"));
});

test("handles HTML injection inside Markdown links", () => {
  const { nodes } = parseRichContent("[<img src=x onerror=alert(1)>](https://anilist.co)");
  const links = findNodes(nodes, (n) => n.type === "link");
  assert.equal(links.length, 1);
  assert.equal(findNodes(nodes, (n) => n.type === "image").length, 0);
});

test("bounds extremely long content and deeply nested markup", () => {
  const huge = "a".repeat(MAX_CONTENT_LENGTH + 5000);
  const { nodes: hugeNodes, truncated } = parseRichContent(huge);
  assert.equal(truncated, true);
  assert.ok(flattenText(hugeNodes).length <= MAX_CONTENT_LENGTH);

  const deep = "**".repeat(30) + "core" + "**".repeat(30);
  const { nodes: deepNodes } = parseRichContent(deep);
  assert.ok(flattenText(deepNodes).includes("core"));
});
