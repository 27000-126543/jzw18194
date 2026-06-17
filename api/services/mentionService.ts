import { parseActions } from '../../shared/utils/mentionParser'
import type { ParsedAction, User } from '../../shared/types'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function parseMentionActions(
  text: string,
  users: User[],
): ParsedAction[] {
  const raw = parseActions(text)
  for (const action of raw) {
    if (!action.assigneeName) continue
    const query = normalizeName(action.assigneeName)
    let matched: User | undefined

    matched = users.find((u) => normalizeName(u.name) === query)

    if (!matched) {
      matched = users.find((u) => normalizeName(u.name).includes(query) || query.includes(normalizeName(u.name)))
    }

    if (matched) {
      action.assigneeId = matched.id
    }
  }
  return raw
}

export default {
  parse: parseMentionActions,
}
