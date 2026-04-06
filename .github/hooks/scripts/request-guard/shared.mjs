import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export function getStatePath(cwd) {
  const digest = crypto
    .createHash("sha256")
    .update(cwd)
    .digest("hex")
    .slice(0, 12);

  return path.join(os.tmpdir(), `copilot-request-guard-${digest}.json`);
}

export function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function safeWriteJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function collectStringValues(value, result = [], depth = 0) {
  if (value == null || depth > 8) {
    return result;
  }

  if (typeof value === "string") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, result, depth + 1);
    }
    return result;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectStringValues(item, result, depth + 1);
    }
  }

  return result;
}

export function buildEventText(event) {
  const values = collectStringValues(event)
    .map((value) => value.trim())
    .filter(Boolean);

  return values.join("\n").slice(0, 50000);
}

export function normalizeGuardText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export function buildPromptLikeText(event) {
  if (!event || typeof event !== "object") {
    return "";
  }

  const sanitizedEvent = Object.fromEntries(
    Object.entries(event).filter(([key]) => key !== "cwd"),
  );

  return normalizeGuardText(buildEventText(sanitizedEvent));
}

export function extractIssueNumbers(text) {
  const normalized = normalizeGuardText(text);
  const matches = normalized.matchAll(/#(\d+)/g);
  const numbers = new Set();

  for (const match of matches) {
    numbers.add(String(match[1] || ""));
  }

  return [...numbers];
}
