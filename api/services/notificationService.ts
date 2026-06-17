import { createNotification } from '../store/notificationStore'
import type { ActionItem, Meeting } from '../../shared/types'

export function triggerActionDone(action: ActionItem, meeting?: Meeting) {
  if (!meeting || !meeting.createdBy) return
  const assigneeName = action.assignee?.name ?? '某人'
  const isSelf = action.assigneeId === meeting.createdBy
  const title = isSelf
    ? '您完成了一项任务'
    : '任务完成提醒'
  const content = isSelf
    ? `您完成了会议「${meeting.title}」中的任务「${action.title}」`
    : `${assigneeName}完成了任务「${action.title}」`
  createNotification({
    userId: meeting.createdBy,
    type: 'action_done',
    title,
    content,
    relatedId: action.id,
  })
}

export function triggerMeetingCreated(meeting: Meeting) {
  const title = meeting.title
  const participantIds = [...meeting.participantIds]
  const creatorId = meeting.createdBy

  createNotification({
    userId: creatorId,
    type: 'meeting_created',
    title: '新会议创建',
    content: `您创建了会议「${title}」`,
    relatedId: meeting.id,
  })

  for (const pid of participantIds) {
    if (pid === creatorId) continue
    createNotification({
      userId: pid,
      type: 'meeting_created',
      title: '新会议邀请',
      content: `您被邀请参加会议「${title}」`,
      relatedId: meeting.id,
    })
  }
}

export default {
  triggerActionDone,
  triggerMeetingCreated,
}
