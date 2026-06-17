import { getStore, nowISO } from './dataStore'
import { findUserById, findAllUsers } from './userStore'
import { findProjectById, findAllProjects } from './projectStore'
import type {
  ActionItem,
  ActionStatus,
  UpdateActionRequest,
} from '../../shared/types'

function computeOverdue(dueDate: string | undefined, status: ActionStatus): boolean {
  if (!dueDate || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

function enrichAction(action: ActionItem): ActionItem {
  const users = findAllUsers()
  const projects = findAllProjects()
  const store = getStore()
  const assignee = users.find((u) => u.id === action.assigneeId)
  const meeting = store.meetings.find((m) => m.id === action.meetingId)
  const project = meeting ? projects.find((p) => p.id === meeting.projectId) : undefined
  return {
    ...action,
    assignee,
    overdue: computeOverdue(action.dueDate, action.status),
    meetingTitle: meeting?.title,
    projectName: project?.name,
    projectColor: project?.color,
  }
}

export interface ActionQuery {
  status?: ActionStatus
  assigneeId?: number
  projectId?: number
  meetingId?: number
}

export function findAllActions(query: ActionQuery = {}): ActionItem[] {
  const store = getStore()
  const { status, assigneeId, projectId, meetingId } = query
  let results = [...store.actionItems]
  if (status) results = results.filter((a) => a.status === status)
  if (assigneeId != null) results = results.filter((a) => a.assigneeId === assigneeId)
  if (meetingId != null) results = results.filter((a) => a.meetingId === meetingId)
  if (projectId != null) {
    const meetingIds = store.meetings
      .filter((m) => m.projectId === projectId)
      .map((m) => m.id)
    results = results.filter((a) => meetingIds.includes(a.meetingId))
  }
  return results.map(enrichAction).sort((a, b) => {
    const order: Record<ActionStatus, number> = { todo: 0, doing: 1, done: 2 }
    const diff = order[a.status] - order[b.status]
    if (diff !== 0) return diff
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function findActionById(id: number): ActionItem | undefined {
  const store = getStore()
  const action = store.actionItems.find((a) => a.id === id)
  return action ? enrichAction(action) : undefined
}

export function createAction(req: {
  meetingId: number
  title: string
  description?: string
  assigneeId: number
  status?: ActionStatus
  dueDate?: string
  fromHistory?: boolean
}): ActionItem {
  const store = getStore()
  const id = store.nextIds.actionItems++
  const now = nowISO()
  const action: ActionItem = {
    id,
    meetingId: req.meetingId,
    title: req.title,
    description: req.description,
    assigneeId: req.assigneeId,
    status: req.status ?? 'todo',
    dueDate: req.dueDate,
    fromHistory: req.fromHistory,
    createdAt: now,
    updatedAt: now,
  }
  store.actionItems.push(action)
  return enrichAction(action)
}

export function updateAction(id: number, req: UpdateActionRequest): ActionItem | undefined {
  const store = getStore()
  const idx = store.actionItems.findIndex((a) => a.id === id)
  if (idx === -1) return undefined
  const existing = store.actionItems[idx]
  const updated: ActionItem = {
    ...existing,
    ...req,
    updatedAt: nowISO(),
  }
  store.actionItems[idx] = updated
  return enrichAction(updated)
}

export function removeAction(id: number): boolean {
  const store = getStore()
  const idx = store.actionItems.findIndex((a) => a.id === id)
  if (idx === -1) return false
  store.actionItems.splice(idx, 1)
  return true
}

export function removeActionsByMeetingId(meetingId: number): number {
  const store = getStore()
  const before = store.actionItems.length
  store.actionItems = store.actionItems.filter((a) => a.meetingId !== meetingId)
  return before - store.actionItems.length
}

export default {
  findAll: findAllActions,
  findById: findActionById,
  create: createAction,
  update: updateAction,
  remove: removeAction,
  removeByMeetingId: removeActionsByMeetingId,
}
