import React from "react";

/**
 * Parses WhatsApp-style text formatting and returns React elements
 * Supports:
 * - *bold* → <strong>bold</strong>
 * - _italic_ → <em>italic</em>
 * - ~strikethrough~ → <del>strikethrough</del>
 * - `code` → <code>code</code>
 */
export function parseWhatsAppFormatting(text: string): React.ReactNode {
  if (!text) return text;

  // Order matters: process from outermost to innermost
  const patterns = [
    { regex: /\*([^*]+)\*/g, wrapper: (content: string, key: number) => <strong key={key}>{content}</strong> },
    { regex: /_([^_]+)_/g, wrapper: (content: string, key: number) => <em key={key}>{content}</em> },
    { regex: /~([^~]+)~/g, wrapper: (content: string, key: number) => <del key={key}>{content}</del> },
    { regex: /`([^`]+)`/g, wrapper: (content: string, key: number) => <code key={key} className="bg-muted px-1 rounded text-xs">{content}</code> },
  ];

  let result: React.ReactNode[] = [text];
  let keyCounter = 0;

  for (const { regex, wrapper } of patterns) {
    const newResult: React.ReactNode[] = [];

    for (const segment of result) {
      if (typeof segment !== "string") {
        newResult.push(segment);
        continue;
      }

      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const localRegex = new RegExp(regex.source, regex.flags);

      while ((match = localRegex.exec(segment)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          newResult.push(segment.slice(lastIndex, match.index));
        }
        // Add wrapped content
        newResult.push(wrapper(match[1], keyCounter++));
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text after last match
      if (lastIndex < segment.length) {
        newResult.push(segment.slice(lastIndex));
      }
    }

    result = newResult;
  }

  return result.length === 1 ? result[0] : <>{result}</>;
}

/**
 * Strips WhatsApp formatting markers and returns plain text
 * Useful for scenarios where you need the text content without formatting
 */
export function stripWhatsAppFormatting(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~([^~]+)~/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
