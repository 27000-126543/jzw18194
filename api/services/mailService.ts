import nodemailer from 'nodemailer'
import type { Meeting, User, ActionItem, EmailSendRequest } from '../../shared/types'
import { findAllActions } from '../store/actionStore'
import { createNotification } from '../store/notificationStore'

let cachedTestAccount: nodemailer.TestAccount | null = null

async function getTestAccount() {
  if (cachedTestAccount) return cachedTestAccount
  cachedTestAccount = await nodemailer.createTestAccount()
  return cachedTestAccount
}

function buildActionsHTML(actions: ActionItem[]): string {
  if (actions.length === 0) {
    return '<p style="color:#6b7280;">暂无待办任务</p>'
  }
  const rows = actions
    .map((a) => {
      const statusColor =
        a.status === 'done'
          ? '#10b981'
          : a.status === 'doing'
          ? '#f59e0b'
          : '#ef4444'
      const statusLabel =
        a.status === 'done' ? '已完成' : a.status === 'doing' ? '进行中' : '待办'
      const overdueTag =
        a.overdue && a.status !== 'done'
          ? '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px;">已逾期</span>'
          : ''
      return `
        <div style="padding:12px 16px;border-left:3px solid ${statusColor};background:#f9fafb;margin-bottom:10px;border-radius:0 6px 6px 0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:600;color:#111827;margin-bottom:4px;">${escapeHTML(a.title)}</div>
              ${
                a.description
                  ? `<div style="color:#6b7280;font-size:13px;">${escapeHTML(a.description)}</div>`
                  : ''
              }
              <div style="margin-top:6px;">
                <span style="background:${statusColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">${statusLabel}</span>
                ${overdueTag}
              </div>
            </div>
            <div style="text-align:right;font-size:13px;color:#6b7280;flex-shrink:0;">
              ${a.dueDate ? `<div>截止：${a.dueDate}</div>` : ''}
              ${a.meetingTitle ? `<div style="margin-top:4px;">来自：${escapeHTML(a.meetingTitle)}</div>` : ''}
            </div>
          </div>
        </div>
      `
    })
    .join('')
  return rows
}

function buildUserEmail(
  user: User,
  meeting: Meeting,
  actions: ActionItem[],
  customNote?: string,
): string {
  const pendingCount = actions.filter((a) => a.status !== 'done').length
  const doneCount = actions.filter((a) => a.status === 'done').length

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>会议待办 - ${escapeHTML(meeting.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">
            ${user.name.charAt(0)}
          </div>
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827;">${escapeHTML(user.name)}，您好！</div>
            <div style="color:#6b7280;font-size:14px;">这是您在本次会议中的待办汇总</div>
          </div>
        </div>
      </div>

      <div style="padding:24px 32px;">
        <div style="margin-bottom:20px;padding:16px 20px;background:#f5f3ff;border-radius:8px;">
          <div style="font-size:13px;color:#6d28d9;margin-bottom:4px;">会议名称</div>
          <div style="font-size:16px;font-weight:600;color:#4c1d95;">${escapeHTML(meeting.title)}</div>
          <div style="margin-top:8px;display:flex;gap:20px;font-size:13px;color:#7c3aed;">
            <span>📅 ${meeting.meetingDate}</span>
            ${meeting.project ? `<span>🏷 ${escapeHTML(meeting.project.name)}</span>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <div style="flex:1;padding:12px 16px;background:#fef3c7;border-radius:8px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#d97706;">${pendingCount}</div>
            <div style="font-size:12px;color:#92400e;">待处理</div>
          </div>
          <div style="flex:1;padding:12px 16px;background:#d1fae5;border-radius:8px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#059669;">${doneCount}</div>
            <div style="font-size:12px;color:#065f46;">已完成</div>
          </div>
        </div>

        ${customNote ? `
          <div style="margin-bottom:20px;padding:12px 16px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px;color:#1e40af;font-size:14px;">
            💬 ${escapeHTML(customNote)}
          </div>
        ` : ''}

        <div style="margin-bottom:12px;font-weight:600;color:#111827;">待办明细</div>
        ${buildActionsHTML(actions)}
      </div>

      <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
        此邮件由会议纪要系统自动发送，请及时处理待办事项。
      </div>
    </div>
  </div>
</body>
</html>
  `
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface SendMeetingEmailResult {
  sent: Array<{ userId: number; email: string; previewUrl: string }>
  skipped: number[]
}

export async function sendMeetingEmails(
  meeting: Meeting,
  users: User[],
  req: EmailSendRequest = {},
): Promise<SendMeetingEmailResult> {
  const allActions = findAllActions({ meetingId: meeting.id })
  const userMap = new Map<number, User>()
  for (const u of users) {
    userMap.set(u.id, u)
  }

  const previewUrls: Array<{ userId: number; email: string; previewUrl: string }> = []
  const skipped: number[] = []

  const account = await getTestAccount()
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })

  const recipients = [...meeting.participantIds]
  if (req.ccCreator && !recipients.includes(meeting.createdBy)) {
    recipients.push(meeting.createdBy)
  }

  for (const uid of recipients) {
    const user = userMap.get(uid)
    if (!user) {
      skipped.push(uid)
      continue
    }
    const userActions = allActions.filter((a) => a.assigneeId === uid)
    const html = buildUserEmail(user, meeting, userActions, req.customNote)

    const info = await transporter.sendMail({
      from: '"会议纪要系统" <noreply@meeting-demo.com>',
      to: user.email,
      subject: `【待办汇总】${meeting.title} - ${meeting.meetingDate}`,
      html,
    })

    const previewUrl = nodemailer.getTestMessageUrl(info) || '#console-only'
    previewUrls.push({ userId: uid, email: user.email, previewUrl })

    console.log(`[mailService] 邮件已发送给 ${user.name}(${user.email})，预览：${previewUrl}`)
  }

  if (previewUrls.length > 0 && meeting.createdBy) {
    createNotification({
      userId: meeting.createdBy,
      type: 'email_sent',
      title: '邮件已发送',
      content: `会议「${meeting.title}」的待办邮件已发送给${previewUrls.length}位参会人`,
      relatedId: meeting.id,
    })
  }

  return { sent: previewUrls, skipped }
}

export default {
  sendMeetingEmails,
}
