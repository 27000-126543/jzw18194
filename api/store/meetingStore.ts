import { getStore, nowISO } from './dataStore'
import { findAllUsers } from './userStore'
import { findAllProjects } from './projectStore'
import { findAllActions, createAction, updateAction, removeAction } from './actionStore'
import type {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  ActionItem,
} from '../../shared/types'

function computeProgress(actions: ActionItem[]): NonNullable<Meeting['progress']> {
  const progress = { todo: 0, doing: 0, done: 0, total: actions.length }
  for (const a of actions) {
    progress[a.status]++
  }
  return progress
}

function enrichMeeting(meeting: Meeting): Meeting {
  const users = findAllUsers()
  const projects = findAllProjects()
  const project = projects.find((p) => p.id === meeting.projectId)
  const creator = users.find((u) => u.id === meeting.createdBy)
  const participants = meeting.participantIds
    .map((pid) => users.find((u) => u.id === pid))
    .filter((u): u is NonNullable<typeof u> => !!u)
  const actionItems = findAllActions({ meetingId: meeting.id })
  return {
    ...meeting,
    project,
    creator,
    participants,
    actionItems,
    progress: computeProgress(actionItems),
  }
}

export interface MeetingQuery {
  projectId?: number
  participantId?: number
  keyword?: string
  from?: string
  to?: string
}

export function findAllMeetings(query: MeetingQuery = {}): Meeting[] {
  const store = getStore()
  const { projectId, participantId, keyword, from, to } = query
  let results = store.meetings.filter((m) => m.deleted === 0)
  if (projectId != null) {
    results = results.filter((m) => m.projectId === projectId)
  }
  if (participantId != null) {
    results = results.filter((m) => m.participantIds.includes(participantId))
  }
  if (from) {
    results = results.filter((m) => m.meetingDate >= from)
  }
  if (to) {
    results = results.filter((m) => m.meetingDate <= to)
  }
  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase()
    results = results.filter((m) => {
      return (
        m.title.toLowerCase().includes(kw) ||
        m.discussionPoints.toLowerCase().includes(kw) ||
        m.decisions.toLowerCase().includes(kw)
      )
    })
  }
  return results
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
    .map(enrichMeeting)
}

export function findMeetingById(id: number): Meeting | undefined {
  const store = getStore()
  const meeting = store.meetings.find((m) => m.id === id && m.deleted === 0)
  return meeting ? enrichMeeting(meeting) : undefined
}

export function createMeeting(
  req: CreateMeetingRequest,
  createdBy: number,
): Meeting {
  const store = getStore()
  const id = store.nextIds.meetings++
  const now = nowISO()
  const meeting: Meeting = {
    id,
    title: req.title,
    projectId: req.projectId,
    meetingDate: req.meetingDate,
    createdBy,
    discussionPoints: req.discussionPoints,
    decisions: req.decisions,
    participantIds: [...req.participantIds],
    createdAt: now,
    updatedAt: now,
    deleted: 0,
  }
  store.meetings.push(meeting)

  if (req.includeActionIds && req.includeActionIds.length > 0) {
    for (const oldId of req.includeActionIds) {
      const oldAction = findAllActions().find((a) => a.id === oldId)
      if (oldAction) {
        createAction({
          meetingId: id,
          title: oldAction.title,
          description: oldAction.description,
          assigneeId: oldAction.assigneeId,
          status: oldAction.status,
          dueDate: oldAction.dueDate,
          fromHistory: true,
        })
      }
    }
  }

  if (req.actionOverrides && req.actionOverrides.length > 0) {
    for (const override of req.actionOverrides) {
      createAction({
        meetingId: id,
        title: override.title,
        description: override.description,
        assigneeId: override.assigneeId,
        status: override.status ?? 'todo',
        dueDate: override.dueDate,
      })
    }
  }

  return enrichMeeting(meeting)
}

function extractActionIdFromTempKey(tempKey?: string): number | undefined {
  if (!tempKey) return undefined
  const existingMatch = tempKey.match(/^existing_(\d+)$/)
  if (existingMatch) return parseInt(existingMatch[1], 10)
  const historyMatch = tempKey.match(/^history_(\d+)$/)
  if (historyMatch) return parseInt(historyMatch[1], 10)
  return undefined
}

export function updateMeeting(
  id: number,
  req: UpdateMeetingRequest,
): Meeting | undefined {
  const store = getStore()
  const idx = store.meetings.findIndex((m) => m.id === id)
  if (idx === -1) return undefined
  const existing = store.meetings[idx]
  const updated: Meeting = {
    ...existing,
    ...req,
    participantIds: req.participantIds
      ? [...req.participantIds]
      : existing.participantIds,
    updatedAt: nowISO(),
  }
  store.meetings[idx] = updated

  const existingActions = findAllActions({ meetingId: id })
  const keptActionIds = new Set<number>()

  if (req.actionOverrides && req.actionOverrides.length > 0) {
    for (const override of req.actionOverrides) {
      const existingId = extractActionIdFromTempKey(override.tempKey)
      if (existingId && existingActions.some((a) => a.id === existingId)) {
        updateAction(existingId, {
          title: override.title,
          description: override.description,
          assigneeId: override.assigneeId,
          status: override.status,
          dueDate: override.dueDate,
        })
        keptActionIds.add(existingId)
      } else {
        const newAction = createAction({
          meetingId: id,
          title: override.title,
          description: override.description,
          assigneeId: override.assigneeId,
          status: override.status ?? 'todo',
          dueDate: override.dueDate,
        })
        keptActionIds.add(newAction.id)
      }
    }
  }

  if (req.includeActionIds && req.includeActionIds.length > 0) {
    for (const oldId of req.includeActionIds) {
      const oldAction = findAllActions().find((a) => a.id === oldId)
      if (!oldAction) continue

      if (oldAction.meetingId === id && oldAction.fromHistory) {
        keptActionIds.add(oldId)
      } else {
        const newAction = createAction({
          meetingId: id,
          title: oldAction.title,
          description: oldAction.description,
          assigneeId: oldAction.assigneeId,
          status: oldAction.status,
          dueDate: oldAction.dueDate,
          fromHistory: true,
        })
        keptActionIds.add(newAction.id)
      }
    }
  }

  for (const existingAction of existingActions) {
    if (!keptActionIds.has(existingAction.id)) {
      removeAction(existingAction.id)
    }
  }

  return enrichMeeting(updated)
}

export function removeMeeting(id: number): boolean {
  const store = getStore()
  const idx = store.meetings.findIndex((m) => m.id === id)
  if (idx === -1) return false
  store.meetings[idx] = {
    ...store.meetings[idx],
    deleted: 1,
    updatedAt: nowISO(),
  }
  return true
}

export function getUnfinishedSiblings(
  projectId: number,
  currentMeetingId?: number,
): ActionItem[] {
  const store = getStore()
  const projectMeetings = store.meetings
    .filter(
      (m) =>
        m.deleted === 0 &&
        m.projectId === projectId &&
        (currentMeetingId === undefined || m.id !== currentMeetingId),
    )
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))

  const meetingDateMap = new Map<number, string>()
  projectMeetings.forEach((m) => meetingDateMap.set(m.id, m.meetingDate))
  const projectMeetingIds = projectMeetings.map((m) => m.id)

  const actions = findAllActions()
  return actions
    .filter(
      (a) =>
        projectMeetingIds.includes(a.meetingId) &&
        a.status !== 'done',
    )
    .sort((a, b) => {
      const dateA = meetingDateMap.get(a.meetingId) || ''
      const dateB = meetingDateMap.get(b.meetingId) || ''
      const dateCompare = dateB.localeCompare(dateA)
      if (dateCompare !== 0) return dateCompare
      return b.createdAt.localeCompare(a.createdAt)
    })
}

export interface StatsResult {
  totalMeetings: number
  pendingActions: number
  weeklyCompletionRate: number
  overdueActions: number
  weeklyDelta: {
    meetings: number
    pending: number
    completion: number
    overdue: number
  }
}

function startOfWeekISO(offsetWeeks = 0): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function endOfWeekISO(offsetWeeks = 0): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + 6 + offsetWeeks * 7)
  d.setHours(23, 59, 59, 999)
  return d.toISOString().slice(0, 10)
}

export function computeStats(): StatsResult {
  const store = getStore()
  const allMeetings = store.meetings.filter((m) => m.deleted === 0)
  const allActions = findAllActions()

  const totalMeetings = allMeetings.length
  const pendingActions = allActions.filter((a) => a.status !== 'done').length
  const overdueActions = allActions.filter((a) => a.overdue).length

  const thisWeekStart = startOfWeekISO(0)
  const thisWeekEnd = endOfWeekISO(0)
  const lastWeekStart = startOfWeekISO(-1)
  const lastWeekEnd = endOfWeekISO(-1)

  const meetingsThisWeek = allMeetings.filter(
    (m) => m.meetingDate >= thisWeekStart && m.meetingDate <= thisWeekEnd,
  ).length
  const meetingsLastWeek = allMeetings.filter(
    (m) => m.meetingDate >= lastWeekStart && m.meetingDate <= lastWeekEnd,
  ).length

  const doneThisWeek = allActions.filter(
    (a) => a.status === 'done' && a.updatedAt.slice(0, 10) >= thisWeekStart,
  ).length
  const allThisWeek = allActions.filter(
    (a) => a.createdAt.slice(0, 10) <= thisWeekEnd,
  ).length
  const weeklyCompletionRate =
    allThisWeek > 0 ? Math.round((doneThisWeek / allThisWeek) * 100) / 100 : 0

  const doneLastWeek = allActions.filter(
    (a) =>
      a.status === 'done' &&
      a.updatedAt.slice(0, 10) >= lastWeekStart &&
      a.updatedAt.slice(0, 10) <= lastWeekEnd,
  ).length
  const allLastWeek = allActions.filter(
    (a) => a.createdAt.slice(0, 10) <= lastWeekEnd,
  ).length
  const lastWeekCompletion =
    allLastWeek > 0 ? Math.round((doneLastWeek / allLastWeek) * 100) / 100 : 0

  const pendingLastWeek = allActions.filter(
    (a) => a.status !== 'done' && a.createdAt.slice(0, 10) <= lastWeekEnd,
  ).length
  const overdueLastWeek = allActions.filter((a) => {
    if (a.status === 'done' || !a.dueDate) return false
    const due = new Date(a.dueDate)
    due.setHours(0, 0, 0, 0)
    const lwEnd = new Date(lastWeekEnd)
    lwEnd.setHours(23, 59, 59, 999)
    return due.getTime() < lwEnd.getTime()
  }).length

  return {
    totalMeetings,
    pendingActions,
    weeklyCompletionRate,
    overdueActions,
    weeklyDelta: {
      meetings: meetingsThisWeek - meetingsLastWeek,
      pending: pendingActions - pendingLastWeek,
      completion: Math.round((weeklyCompletionRate - lastWeekCompletion) * 100) / 100,
      overdue: overdueActions - overdueLastWeek,
    },
  }
}

export default {
  findAll: findAllMeetings,
  findById: findMeetingById,
  create: createMeeting,
  update: updateMeeting,
  remove: removeMeeting,
  getUnfinishedSiblings,
  computeStats,
}
