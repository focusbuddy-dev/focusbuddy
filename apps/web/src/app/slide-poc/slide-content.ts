const slideSeparator = /^---\s*$/m;

export function splitSlides(markdown: string): string[] {
  const slides = markdown
    .split(slideSeparator)
    .map((slide) => slide.trim())
    .filter((slide) => slide.length > 0);
  return slides.length > 0 ? slides : [markdown.trim()].filter((slide) => slide.length > 0);
}

export function extractSlideTitle(slideMarkdown: string, fallback: string): string {
  const headingMatch = slideMarkdown.match(/^#{1,6}\s+(.+?)\s*$/m);
  const headingText = headingMatch?.[1]?.trim();
  if (headingText && headingText.length > 0) {
    return headingText;
  }
  const firstLine = slideMarkdown.split('\n').find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? fallback;
}

export function extractSlideExcerpt(slideMarkdown: string, max = 140): string {
  const lines = slideMarkdown.split('\n');
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line.trim()));
  const body = (headingIndex >= 0 ? lines.slice(headingIndex + 1) : lines)
    .map((line) => line.trim().replace(/^[-*]\s+/, '').replace(/[`*_>#~]/g, ''))
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (body.length <= max) {
    return body;
  }
  return `${body.slice(0, max - 1)}…`;
}

export function encodeSlideContent(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSlideContent(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(paddingNeeded);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}
