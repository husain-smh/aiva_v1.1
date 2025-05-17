export function containsMarkdown(text: string): boolean {
  // Common markdown patterns
  const markdownPatterns = [
    /#{1,6}\s/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /\[.*?\]\(.*?\)/, // Links
    /```[\s\S]*?```/, // Code blocks
    /`.*?`/, // Inline code
    /^\s*[-*+]\s/, // Unordered lists
    /^\s*\d+\.\s/, // Ordered lists
    /^\s*>\s/, // Blockquotes
    /^\s*[-*_]{3,}\s*$/, // Horizontal rules
    /^\s*\|.*\|.*$/, // Tables
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
} 