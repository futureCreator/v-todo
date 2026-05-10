// lib/tags.ts — Inline hashtag parsing utilities

const TAG_REGEX = /#([^\s#]+)/g;

/** Extract unique tags from text (without # prefix) */
export function extractTags(text: string): string[] {
  const matches = text.matchAll(TAG_REGEX);
  return [...new Set([...matches].map((m) => m[1]))];
}

/** Split text into renderable segments of plain text and tags */
export function splitParts(
  text: string
): Array<{ type: "text" | "tag"; value: string; key: string }> {
  const parts: Array<{ type: "text" | "tag"; value: string; key: string }> = [];
  let lastIndex = 0;
  let counter = 0;

  for (const match of text.matchAll(TAG_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, index),
        key: `t${counter++}@${index}`,
      });
    }
    parts.push({
      type: "tag",
      value: match[1],
      key: `g${counter++}@${index}`,
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
      key: `t${counter++}@${lastIndex}`,
    });
  }

  return parts;
}
