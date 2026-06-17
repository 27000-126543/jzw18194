import type { ParsedAction, ActionStatus } from '../types'

const DUE_KEYWORDS = ['截止', 'DDL', 'ddl', 'due', 'Due', 'DUE', 'by', 'BY', 'By']

const ACTION_TAG_PATTERN = /^#Action$/i
const MENTION_PATTERN = /^@([^\s@#]+)$/

const DATE_PATTERNS: Array<{ regex: RegExp; parse: (match: RegExpMatchArray, currentYear: number) => string | null }> = [
  {
    regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    parse: (match) => {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10)
      const day = parseInt(match[3], 10)
      if (month < 1 || month > 12 || day < 1 || day > 31) return null
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    },
  },
  {
    regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/,
    parse: (match, currentYear) => {
      let year = match[3] ? parseInt(match[3], 10) : currentYear
      const month = parseInt(match[1], 10)
      const day = parseInt(match[2], 10)
      if (year < 100) year += 2000
      if (month < 1 || month > 12 || day < 1 || day > 31) return null
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    },
  },
  {
    regex: /^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?$/,
    parse: (match, currentYear) => {
      const year = match[1] ? parseInt(match[1], 10) : currentYear
      const month = parseInt(match[2], 10)
      const day = parseInt(match[3], 10)
      if (month < 1 || month > 12 || day < 1 || day > 31) return null
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    },
  },
]

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function parseDate(raw: string): string | null {
  const currentYear = getCurrentYear()
  const cleaned = raw.trim()
  for (const { regex, parse } of DATE_PATTERNS) {
    const match = cleaned.match(regex)
    if (match) {
      const result = parse(match, currentYear)
      if (result) return result
    }
  }
  return null
}

function isDueKeyword(token: string): boolean {
  return DUE_KEYWORDS.includes(token)
}

function splitTokensWithIndices(text: string): Array<{ token: string; start: number; end: number }> {
  const tokens: Array<{ token: string; start: number; end: number }> = []
  const regex = /\S+/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return tokens
}

function generateTempKey(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function parseActions(text: string): ParsedAction[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const results: ParsedAction[] = []
  const tokens = splitTokensWithIndices(text)
  if (tokens.length === 0) return results

  const starts: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].token
    if (ACTION_TAG_PATTERN.test(t) || MENTION_PATTERN.test(t)) {
      starts.push(i)
    }
  }

  if (starts.length === 0) return results

  for (let si = 0; si < starts.length; si++) {
    const startIdx = starts[si]
    const endIdx = si + 1 < starts.length ? starts[si + 1] : tokens.length

    const segmentTokens = tokens.slice(startIdx, endIdx)
    if (segmentTokens.length === 0) continue

    let assigneeName = ''
    let dueDate: string | undefined
    let titleParts: string[] = []
    let descriptionParts: string[] = []
    let status: ActionStatus | undefined
    let hasActionTag = false
    let foundDueKeyword = false
    let inDescription = false

    for (let ti = 0; ti < segmentTokens.length; ti++) {
      const { token } = segmentTokens[ti]

      if (ACTION_TAG_PATTERN.test(token)) {
        hasActionTag = true
        continue
      }

      const mentionMatch = token.match(MENTION_PATTERN)
      if (mentionMatch) {
        if (!assigneeName) {
          assigneeName = mentionMatch[1]
          continue
        }
      }

      if (isDueKeyword(token) && ti + 1 < segmentTokens.length) {
        foundDueKeyword = true
        continue
      }

      if (foundDueKeyword) {
        const parsed = parseDate(token)
        if (parsed) {
          dueDate = parsed
          foundDueKeyword = false
          continue
        }
      }

      if (/^状态[:：]\s*(todo|doing|done)$/i.test(token)) {
        const m = token.match(/^状态[:：]\s*(todo|doing|done)$/i)
        if (m) status = m[1].toLowerCase() as ActionStatus
        continue
      }

      if (token === '|' || token === '||') {
        inDescription = true
        continue
      }

      if (!inDescription) {
        titleParts.push(token)
      } else {
        descriptionParts.push(token)
      }
    }

    if (!hasActionTag && !assigneeName) continue

    let title = titleParts.join(' ').trim()
    if (title.endsWith('。') || title.endsWith('.')) {
      title = title.slice(0, -1).trim()
    }
    if (!title) {
      title = assigneeName ? `${assigneeName}的任务` : '未命名任务'
    }

    const description = descriptionParts.length > 0 ? descriptionParts.join(' ').trim() : undefined

    const segStart = segmentTokens[0].start
    const segEnd = segmentTokens[segmentTokens.length - 1].end

    results.push({
      tempKey: generateTempKey(),
      title,
      assigneeName,
      dueDate,
      status,
      description,
      start: segStart,
      end: segEnd,
    })
  }

  return results
}

export function parseActionsFromText(text: string): ParsedAction[] {
  return parseActions(text)
}

export function renderToHTML(text: string, actions: ParsedAction[]): string {
  if (actions.length === 0) return text
  const sorted = [...actions].sort((a, b) => a.start - b.start)
  let html = ''
  let cursor = 0
  for (const action of sorted) {
    if (action.start > cursor) {
      html += escapeHTML(text.slice(cursor, action.start))
    }
    const snippet = text.slice(action.start, action.end)
    html += `<mark class="parsed-action" data-key="${action.tempKey}">${escapeHTML(snippet)}</mark>`
    cursor = action.end
  }
  if (cursor < text.length) {
    html += escapeHTML(text.slice(cursor))
  }
  return html
}

export function renderParsedActionsToHTML(text: string, actions: ParsedAction[]): string {
  return renderToHTML(text, actions)
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default parseActions
