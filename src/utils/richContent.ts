import { sanitizeExternalUrl, sanitizeImageUrl } from "./safeUrl.ts";

export const MAX_CONTENT_LENGTH = 20_000;
export const MAX_PARSE_DEPTH = 10;
export const MAX_AST_NODES = 1500;
export const MAX_IMAGES = 8;

export type RichNode =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "bold"; children: RichNode[] }
  | { type: "italic"; children: RichNode[] }
  | { type: "strike"; children: RichNode[] }
  | { type: "code"; value: string }
  | { type: "spoiler"; children: RichNode[] }
  | { type: "link"; href: string; children: RichNode[] }
  | { type: "image"; src: string; alt: string }
  | { type: "paragraph"; children: RichNode[] }
  | { type: "blockquote"; children: RichNode[] };

interface ParseContext {
  nodeCount: number;
  imageCount: number;
}

const SAFE_HTML_TAGS = new Set([
  "br",
  "p",
  "b",
  "strong",
  "i",
  "em",
  "del",
  "s",
  "code",
  "span",
  "a",
]);

/**
 * Normalizes AniList basic HTML tags into AniList Markdown equivalents
 * while stripping all unsafe tags, event handlers, and dangerous attributes.
 * Unknown/unsafe tags are escaped as plain text or stripped without execution.
 */
function preprocessBasicHtml(input: string): string {
  // Convert <br> / <br/> to newlines
  let out = input.replace(/<br\s*\/?>/gi, "\n");

  // Convert <p>...</p> blocks to double newlines
  out = out.replace(/<\/?p(?:\s+[^>]*)?>/gi, (tag) =>
    tag.startsWith("</") ? "\n\n" : "",
  );

  // Convert simple formatting tags to Markdown tokens, ignoring all attributes
  out = out.replace(/<(b|strong)(?:\s+[^>]*)?>/gi, "**");
  out = out.replace(/<\/(b|strong)>/gi, "**");
  out = out.replace(/<(i|em)(?:\s+[^>]*)?>/gi, "*");
  out = out.replace(/<\/(i|em)>/gi, "*");
  out = out.replace(/<(del|s)(?:\s+[^>]*)?>/gi, "~~");
  out = out.replace(/<\/(del|s)>/gi, "~~");
  out = out.replace(/<code(?:\s+[^>]*)?>/gi, "`");
  out = out.replace(/<\/code>/gi, "`");

  // Convert AniList spoiler spans: <span class="markdown_spoiler">...</span>
  out = out.replace(
    /<span\b[^>]*class\s*=\s*["'][^"']*markdown_spoiler[^"']*["'][^>]*>/gi,
    "~!",
  );
  out = out.replace(/<\/span>/gi, "!~");

  // Convert safe <a href="...">text</a> links; reject unsafe hrefs
  out = out.replace(
    /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_, dHref: string | undefined, sHref: string | undefined, label: string) => {
      const safe = sanitizeExternalUrl(dHref ?? sHref ?? "");
      const cleanLabel = label.replace(/<[^>]*>/g, "").trim() || "link";
      return safe ? `[${cleanLabel}](${safe})` : cleanLabel;
    },
  );

  // Strip any remaining HTML tags (e.g., <script>, <svg>, <iframe>, <img onerror=...>)
  // so they never execute and don't clutter descriptions
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => {
    const match = /^<\/?([a-zA-Z0-9-]+)/.exec(tag);
    const name = match?.[1]?.toLowerCase() ?? "";
    if (SAFE_HTML_TAGS.has(name)) return "";
    return "";
  });

  return out;
}

function parseInline(
  text: string,
  depth: number,
  ctx: ParseContext,
): RichNode[] {
  if (!text) return [];
  if (depth >= MAX_PARSE_DEPTH || ctx.nodeCount >= MAX_AST_NODES) {
    ctx.nodeCount += 1;
    return [{ type: "text", value: text }];
  }

  const nodes: RichNode[] = [];
  let i = 0;

  const pushText = (chunk: string) => {
    if (!chunk) return;
    const last = nodes[nodes.length - 1];
    if (last && last.type === "text") {
      last.value += chunk;
    } else {
      ctx.nodeCount += 1;
      nodes.push({ type: "text", value: chunk });
    }
  };

  while (i < text.length && ctx.nodeCount < MAX_AST_NODES) {
    // Spoiler: ~!...!~
    if (text.startsWith("~!", i)) {
      const end = text.indexOf("!~", i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        ctx.nodeCount += 1;
        nodes.push({
          type: "spoiler",
          children: parseInline(inner, depth + 1, ctx),
        });
        i = end + 2;
        continue;
      }
    }

    // AniList image syntax: img(url) or img123(url)
    if (text.startsWith("img", i)) {
      const imgMatch = /^img\d*\(([^)\s]+)\)/.exec(text.slice(i));
      if (imgMatch) {
        const safeSrc =
          ctx.imageCount < MAX_IMAGES ? sanitizeImageUrl(imgMatch[1]) : null;
        if (safeSrc) {
          ctx.imageCount += 1;
          ctx.nodeCount += 1;
          nodes.push({ type: "image", src: safeSrc, alt: "Embedded image" });
        } else {
          pushText("[image]");
        }
        i += imgMatch[0].length;
        continue;
      }
    }

    // Markdown image: ![alt](url)
    if (text.startsWith("![", i)) {
      const mdImg = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(text.slice(i));
      if (mdImg) {
        const safeSrc =
          ctx.imageCount < MAX_IMAGES ? sanitizeImageUrl(mdImg[2]) : null;
        if (safeSrc) {
          ctx.imageCount += 1;
          ctx.nodeCount += 1;
          nodes.push({
            type: "image",
            src: safeSrc,
            alt: mdImg[1] || "Embedded image",
          });
        } else {
          pushText(mdImg[1] ? `[${mdImg[1]}]` : "[image]");
        }
        i += mdImg[0].length;
        continue;
      }
    }

    // Markdown link: [label](url)
    if (text[i] === "[") {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i));
      if (linkMatch) {
        const safeHref = sanitizeExternalUrl(linkMatch[2]);
        if (safeHref) {
          ctx.nodeCount += 1;
          nodes.push({
            type: "link",
            href: safeHref,
            children: parseInline(linkMatch[1], depth + 1, ctx),
          });
        } else {
          pushText(linkMatch[1]);
        }
        i += linkMatch[0].length;
        continue;
      }
    }

    // Inline code: `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1 && end > i + 1) {
        ctx.nodeCount += 1;
        nodes.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Bold: **text** or __text__
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end !== -1 && end > i + 2) {
        ctx.nodeCount += 1;
        nodes.push({
          type: "bold",
          children: parseInline(text.slice(i + 2, end), depth + 1, ctx),
        });
        i = end + 2;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (text.startsWith("~~", i)) {
      const end = text.indexOf("~~", i + 2);
      if (end !== -1 && end > i + 2) {
        ctx.nodeCount += 1;
        nodes.push({
          type: "strike",
          children: parseInline(text.slice(i + 2, end), depth + 1, ctx),
        });
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* or _text_ (avoid matching mid-word underscores)
    if (text[i] === "*" || (text[i] === "_" && (i === 0 || /\s/.test(text[i - 1])))) {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && end > i + 1 && !text.slice(i + 1, end).includes("\n")) {
        ctx.nodeCount += 1;
        nodes.push({
          type: "italic",
          children: parseInline(text.slice(i + 1, end), depth + 1, ctx),
        });
        i = end + 1;
        continue;
      }
    }

    // Line break
    if (text[i] === "\n") {
      ctx.nodeCount += 1;
      nodes.push({ type: "break" });
      i += 1;
      continue;
    }

    pushText(text[i]);
    i += 1;
  }

  return nodes;
}

export interface ParseRichContentOptions {
  allowBasicHtml?: boolean;
}

export function parseRichContent(
  raw: string,
  options: ParseRichContentOptions = {},
): { nodes: RichNode[]; truncated: boolean } {
  if (!raw || typeof raw !== "string") {
    return { nodes: [], truncated: false };
  }

  const truncated = raw.length > MAX_CONTENT_LENGTH;
  let source = truncated ? raw.slice(0, MAX_CONTENT_LENGTH) : raw;

  if (options.allowBasicHtml) {
    source = preprocessBasicHtml(source);
  }

  // Strip AniList ~~~ center tags cleanly
  source = source.replace(/~~~/g, "");

  const ctx: ParseContext = { nodeCount: 0, imageCount: 0 };
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const result: RichNode[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || ctx.nodeCount >= MAX_AST_NODES) continue;

    if (trimmed.startsWith("> ")) {
      const quoteText = trimmed
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n");
      ctx.nodeCount += 1;
      result.push({
        type: "blockquote",
        children: parseInline(quoteText, 0, ctx),
      });
    } else {
      ctx.nodeCount += 1;
      result.push({
        type: "paragraph",
        children: parseInline(trimmed, 0, ctx),
      });
    }
  }

  return { nodes: result, truncated };
}
