export type HighlightSegment = {
  text: string;
  highlight: boolean;
};

export function applyHighlight(text: string, keyword: string): HighlightSegment[] {
  if (!text || !keyword || keyword.trim() === '') {
    return [{ text, highlight: false }];
  }

  const normalizedText = text;
  const normalizedKeyword = keyword.trim();

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let searchIndex = normalizedText.toLowerCase().indexOf(normalizedKeyword.toLowerCase());

  while (searchIndex !== -1) {
    if (searchIndex > lastIndex) {
      segments.push({
        text: normalizedText.slice(lastIndex, searchIndex),
        highlight: false,
      });
    }

    segments.push({
      text: normalizedText.slice(searchIndex, searchIndex + normalizedKeyword.length),
      highlight: true,
    });

    lastIndex = searchIndex + normalizedKeyword.length;
    searchIndex = normalizedText.toLowerCase().indexOf(normalizedKeyword.toLowerCase(), lastIndex);
  }

  if (lastIndex < normalizedText.length) {
    segments.push({
      text: normalizedText.slice(lastIndex),
      highlight: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, highlight: false }];
}

export function textWithPlaceholders(text: string, keyword: string): string {
  if (!text || !keyword || keyword.trim() === '') {
    return text;
  }

  const normalizedKeyword = keyword.trim();
  const regex = new RegExp(`(${escapeRegExp(normalizedKeyword)})`, 'gi');
  return text.replace(regex, '[[HIGHLIGHT]]$1[[/HIGHLIGHT]]');
}

export function renderHighlight(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[\[HIGHLIGHT\]\]/g, '<span class="search-highlight">')
    .replace(/\[\[\/HIGHLIGHT\]\]/g, '</span>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
