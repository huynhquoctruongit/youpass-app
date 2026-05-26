// Shared lightweight HTML → React Native Text renderer.
// Handles: <b> <strong> <i> <em> <mark> <br> block tags, HTML entities.
// <mark> renders in orange (highlights the vocabulary word in example sentences).
// All other tags (e.g. <span class="color">) are stripped; their text is kept.

import { Text } from "react-native";

type Segment = { text: string; bold: boolean; italic: boolean; highlight: boolean };

export function parseHTML(raw: string): Segment[] {
  const segments: Segment[] = [];

  // 1. Block tags → newline
  let html = raw
    .replace(/<\/?(p|div|li|ul|ol|section|article|h[1-6])[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // 2. Strip everything that is NOT in our render whitelist
  html = html.replace(/<(?!\/?(?:b|strong|i|em|mark)\b)[^>]+>/gi, "").trim();

  // 3. Split on whitelisted tags (capturing group keeps them as tokens)
  const parts = html.split(/(<\/?(?:b|strong|i|em|mark)[^>]*>)/gi);

  let bold = false, italic = false, highlight = false;

  for (const part of parts) {
    if (/^<(b|strong)\b/i.test(part))  { bold      = true;  continue; }
    if (/^<\/(b|strong)>/i.test(part)) { bold      = false; continue; }
    if (/^<(i|em)\b/i.test(part))      { italic    = true;  continue; }
    if (/^<\/(i|em)>/i.test(part))     { italic    = false; continue; }
    if (/^<mark\b/i.test(part))        { highlight = true;  continue; }
    if (/^<\/mark>/i.test(part))       { highlight = false; continue; }
    if (/^<[^>]+>$/.test(part))        { continue; }         // leftover tags

    const text = part
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    if (text) segments.push({ text, bold, italic, highlight });
  }

  return segments;
}

export function HTMLText({
  html,
  style,
  numberOfLines,
}: {
  html: string;
  style?: object;
  numberOfLines?: number;
}) {
  const segments = parseHTML(html);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={{
            fontWeight: seg.bold || seg.highlight ? "700" : "normal",
            fontStyle:  seg.italic ? "italic" : "normal",
            color:      seg.highlight ? "#F97316" : undefined,
          }}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}
