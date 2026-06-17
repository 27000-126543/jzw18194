type DateFormat = 'YYYY-MM-DD' | 'MM月DD日' | 'relative';

export function formatDate(iso: string | undefined | null, format: DateFormat = 'YYYY-MM-DD'): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';

  if (format === 'relative') {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === -1) return '昨天';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}天前`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();
    return year === currentYear ? `${month}月${day}日` : `${year}年${month}月${day}日`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }

  if (format === 'MM月DD日') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return '';
}

export function isOverdue(dueDate: string | undefined | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due.getTime() < now.getTime();
}

export function parseChineseDate(text: string): string | null {
  if (!text) return null;
  const cleaned = text.trim();
  const currentYear = new Date().getFullYear();

  const patterns: Array<{ regex: RegExp; parse: (match: RegExpMatchArray) => string | null }> = [
    {
      regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      parse: (match) => {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      },
    },
    {
      regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/,
      parse: (match) => {
        let year = match[3] ? parseInt(match[3], 10) : currentYear;
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        if (year < 100) year += 2000;
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      },
    },
    {
      regex: /^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?$/,
      parse: (match) => {
        const year = match[1] ? parseInt(match[1], 10) : currentYear;
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      },
    },
  ];

  for (const { regex, parse } of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      const result = parse(match);
      if (result) return result;
    }
  }

  return null;
}
