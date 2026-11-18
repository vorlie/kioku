import { open } from "@tauri-apps/plugin-shell";

const CONTROL_AND_WHITESPACE_RE = /[\u0000-\u001F\u007F]/g;

/**
 * Validates an external link URL.
 * Allows only explicit http: and https: URLs; rejects javascript:, vbscript:,
 * data:, file:, blob:, protocol-relative //, and obfuscated control chars.
 */
export function sanitizeExternalUrl(rawUrl: string): string | null {
  if (typeof rawUrl !== "string") return null;

  const cleaned = rawUrl.replace(CONTROL_AND_WHITESPACE_RE, "").trim();
  if (!cleaned || cleaned.startsWith("//")) return null;

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates a remote image URL.
 * Requires https: and rejects SVG files to mitigate SVG payload risks.
 */
export function sanitizeImageUrl(rawUrl: string): string | null {
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) return null;

  try {
    const parsed = new URL(safe);
    if (parsed.protocol !== "https:") {
      return null;
    }
    const lowerPath = parsed.pathname.toLowerCase();
    if (lowerPath.endsWith(".svg") || lowerPath.endsWith(".svgz")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Safely opens an external URL via Tauri shell after strict protocol validation.
 */
export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) return false;
  await open(safe);
  return true;
}
