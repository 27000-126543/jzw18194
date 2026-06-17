import { findAllMeetings, findAllActions } from '../store'
import { findAllUsers } from '../store/userStore'
import { findAllProjects } from '../store/projectStore'
import type {
  SearchResponse,
  SearchMeetingHit,
  SearchActionHit,
  User,
  Project,
  Meeting,
  ActionItem,
} from '../../shared/types'

export interface SearchQuery {
  keyword: string
  projectIds?: number[]
  participantIds?: number[]
  dateFrom?: string
  dateTo?: string
}

function buildSnippet(text: string, keyword: string, windowSize = 40): string {
  if (!text || !keyword) return ''
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) {
    return text.length > windowSize * 2 ? text.slice(0, windowSize * 2) + '...' : text
  }
  const start = Math.max(0, idx - windowSize)
  const end = Math.min(text.length, idx + keyword.length + windowSize)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return prefix + text.slice(start, end) + suffix
}

function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text
  const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi')
  return text.replace(regex, '<mark style="background:#fef08a;padding:0 2px;border-radius:2px;">$1</mark>')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function search(query: SearchQuery): SearchResponse {
  const { keyword, projectIds, participantIds, dateFrom, dateTo } = query
  const kw = (keyword || '').trim()
  if (!kw) {
    return { meetings: [], actions: [] }
  }

  const users = findAllUsers()
  const projects = findAllProjects()
  const userMap = new Map<number, User>()
  const projectMap = new Map<number, Project>()
  users.forEach((u) => userMap.set(u.id, u))
  projects.forEach((p) => projectMap.set(p.id, p))

  let meetings = findAllMeetings()
  if (projectIds && projectIds.length > 0) {
    meetings = meetings.filter((m) => projectIds.includes(m.projectId))
  }
  if (participantIds && participantIds.length > 0) {
    meetings = meetings.filter((m) =>
      participantIds.some((pid) => m.participantIds.includes(pid)),
    )
  }
  if (dateFrom) {
    meetings = meetings.filter((m) => m.meetingDate >= dateFrom)
  }
  if (dateTo) {
    meetings = meetings.filter((m) => m.meetingDate <= dateTo)
  }

  const kwLower = kw.toLowerCase()
  const matchedMeetings: Meeting[] = meetings.filter((m) => {
    return (
      m.title.toLowerCase().includes(kwLower) ||
      m.discussionPoints.toLowerCase().includes(kwLower) ||
      m.decisions.toLowerCase().includes(kwLower)
    )
  })

  const meetingHits: SearchMeetingHit[] = matchedMeetings.map((m) => {
    const project = projectMap.get(m.projectId)
    const matchedParts: Array<{ field: string; snippet: string }> = []
    const fields: Array<{ key: string; value: string; label: string }> = [
      { key: 'title', value: m.title, label: '会议标题' },
      { key: 'discussionPoints', value: m.discussionPoints, label: '讨论要点' },
      { key: 'decisions', value: m.decisions, label: '决策结论' },
    ]
    for (const f of fields) {
      if (f.value.toLowerCase().includes(kwLower)) {
        matchedParts.push({
          field: f.label,
          snippet: highlightKeyword(buildSnippet(f.value, kw), kw),
        })
      }
    }

    const matchedParticipants = participantIds
      ? m.participantIds
          .filter((pid) => participantIds.includes(pid))
          .map((pid) => userMap.get(pid))
          .filter((u): u is User => !!u)
      : []

    return {
      id: m.id,
      title: m.title,
      projectName: project?.name ?? '',
      projectColor: project?.color ?? '',
      meetingDate: m.meetingDate,
      highlights: matchedParts,
      matchedParticipants,
    }
  })

  let actions = findAllActions()
  if (projectIds && projectIds.length > 0) {
    const meetingIdsForProjects = meetings
      .filter((m) => projectIds.includes(m.projectId))
      .map((m) => m.id)
    actions = actions.filter((a) => meetingIdsForProjects.includes(a.meetingId))
  }

  const matchedActions: ActionItem[] = actions.filter((a) => {
    return (
      a.title.toLowerCase().includes(kwLower) ||
      (a.description?.toLowerCase() ?? '').includes(kwLower)
    )
  })

  const actionHits: SearchActionHit[] = matchedActions.map((a) => {
    const matchedMeet = findAllMeetings().find((m) => m.id === a.meetingId)
    let snippet = a.title
    if (a.description && a.description.toLowerCase().includes(kwLower)) {
      snippet = buildSnippet(a.description, kw)
    } else if (!a.title.toLowerCase().includes(kwLower)) {
      snippet = buildSnippet(a.title, kw)
    }
    return {
      id: a.id,
      title: a.title,
      meetingTitle: matchedMeet?.title ?? '',
      meetingId: a.meetingId,
      snippet: highlightKeyword(snippet, kw),
      status: a.status,
      assignee: a.assignee,
    }
  })

  return {
    meetings: meetingHits,
    actions: actionHits,
  }
}

export default {
  search,
}
