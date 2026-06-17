import fs from 'fs'
import path from 'path'
import type {
  User,
  Project,
  Meeting,
  ActionItem,
  Notification,
  ActionStatus,
} from '../../shared/types'

export interface DataStoreShape {
  users: User[]
  projects: Project[]
  meetings: Meeting[]
  actionItems: ActionItem[]
  notifications: Notification[]
  nextIds: {
    users: number
    projects: number
    meetings: number
    actionItems: number
    notifications: number
  }
}

const DATA_DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:\/)/, '$1')))
const DATA_FILE = path.join(DATA_DIR, 'data.json')

let storeInstance: DataStoreShape | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave = false

function nowISO(): string {
  return new Date().toISOString()
}

function buildSeedData(): DataStoreShape {
  const users: User[] = [
    { id: 1, name: '张伟', email: 'zhangwei@demo.com', avatarColor: 'sky-600', role: 'admin' },
    { id: 2, name: '李娜', email: 'lina@demo.com', avatarColor: 'rose-500', role: 'member' },
    { id: 3, name: '王磊', email: 'wanglei@demo.com', avatarColor: 'violet-600', role: 'member' },
    { id: 4, name: '刘洋', email: 'liuyang@demo.com', avatarColor: 'teal-600', role: 'member' },
    { id: 5, name: '陈静', email: 'chenjing@demo.com', avatarColor: 'orange-500', role: 'member' },
  ]

  const projects: Project[] = [
    { id: 1, name: 'Alpha产品升级', color: 'indigo-500' },
    { id: 2, name: 'Q3市场营销', color: 'amber-500' },
    { id: 3, name: '内部流程优化', color: 'emerald-500' },
  ]

  const meetings: Meeting[] = [
    {
      id: 1,
      title: 'Alpha v2.0 需求评审会',
      projectId: 1,
      meetingDate: '2026-05-26',
      createdBy: 1,
      discussionPoints:
        '本次会议讨论Alpha v2.0核心功能需求。\n' +
        '@张伟 #Action 完成用户权限模块PRD 截止 2026-05-30\n' +
        '@李娜 #Action 梳理竞品分析报告 截止 2026-06-02\n' +
        '另外需要关注数据迁移方案的可行性。\n' +
        '@王磊 #Action 设计新版首页交互原型 截止 6月5日',
      decisions:
        '1. 确定v2.0功能范围，砍掉复杂报表模块\n' +
        '2. 采用渐进式数据迁移策略\n' +
        '3. @刘洋 #Action 编写数据库迁移脚本 截止 6/10',
      participantIds: [1, 2, 3, 4],
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
      deleted: 0,
    },
    {
      id: 2,
      title: 'Q3营销渠道启动会',
      projectId: 2,
      meetingDate: '2026-05-28',
      createdBy: 5,
      discussionPoints:
        '讨论Q3季度营销预算分配和渠道选择。\n' +
        '@陈静 #Action 制定KOL合作清单 截止 2026-06-01\n' +
        '@李娜 #Action 设计社交媒体投放素材 截止 6月8日\n' +
        '预算初步定在80万，重点在短视频和社区。',
      decisions:
        '1. 预算分配：短视频50%，社区30%，其他20%\n' +
        '2. 6月中旬启动第一波投放\n' +
        '3. @张伟 #Action 审核投放预算明细 截止 2026-06-05',
      participantIds: [1, 2, 5],
      createdAt: '2026-05-28T14:00:00.000Z',
      updatedAt: '2026-05-28T14:00:00.000Z',
      deleted: 0,
    },
    {
      id: 3,
      title: '内部流程诊断第一次会议',
      projectId: 3,
      meetingDate: '2026-06-02',
      createdBy: 3,
      discussionPoints:
        '梳理当前各部门痛点，识别可优化环节。\n' +
        '@王磊 #Action 访谈销售团队记录痛点 截止 2026-06-06\n' +
        '@刘洋 #Action 梳理现有审批流程文档 截止 6月7日\n' +
        '研发团队反馈Bug跟踪工具效率低，考虑更换。',
      decisions:
        '1. 优先优化审批流程（预估节省30%时间）\n' +
        '2. Bug跟踪工具评估2个候选方案\n' +
        '3. @陈静 #Action 调研3款Bug管理工具 截止 6/12',
      participantIds: [3, 4, 5],
      createdAt: '2026-06-02T09:30:00.000Z',
      updatedAt: '2026-06-02T09:30:00.000Z',
      deleted: 0,
    },
    {
      id: 4,
      title: 'Alpha v2.0 技术方案评审',
      projectId: 1,
      meetingDate: '2026-06-04',
      createdBy: 1,
      discussionPoints:
        '评审前端架构和后端API设计方案。\n' +
        '@刘洋 #Action 完成API接口文档初稿 截止 2026-06-08\n' +
        '@王磊 #Action 搭建前端微前端框架 截止 6月15日\n' +
        '@李娜 #Action 制定UI组件规范 截止 2026-06-10\n' +
        '性能指标要求首屏加载<2s。',
      decisions:
        '1. 采用React + Module Federation微前端方案\n' +
        '2. 后端API走GraphQL聚合层\n' +
        '3. @张伟 #Action 采购CDN加速服务 截止 6/18',
      participantIds: [1, 2, 3, 4],
      createdAt: '2026-06-04T10:30:00.000Z',
      updatedAt: '2026-06-04T10:30:00.000Z',
      deleted: 0,
    },
    {
      id: 5,
      title: 'Q3营销素材创意讨论',
      projectId: 2,
      meetingDate: '2026-06-09',
      createdBy: 5,
      discussionPoints:
        '头脑风暴营销创意，确定3个核心传播点。\n' +
        '@李娜 #Action 输出3套创意海报 截止 2026-06-14\n' +
        '@陈静 #Action 撰写品牌故事文案 截止 6月13日\n' +
        '@张伟 #Action 联系媒体合作伙伴 截止 2026-06-16\n' +
        '重点突出产品易用性和性价比。',
      decisions:
        '1. 主视觉色调沿用品牌蓝+活力橙\n' +
        '2. 制作15秒短视频3条用于投放\n' +
        '3. @刘洋 #Action 协助制作短视频素材 截止 6/15',
      participantIds: [1, 2, 4, 5],
      createdAt: '2026-06-09T14:00:00.000Z',
      updatedAt: '2026-06-09T14:00:00.000Z',
      deleted: 0,
    },
    {
      id: 6,
      title: '流程优化方案中期汇报',
      projectId: 3,
      meetingDate: '2026-06-11',
      createdBy: 3,
      discussionPoints:
        '汇报第一阶段调研成果，讨论优化方案初稿。\n' +
        '@王磊 #Action 绘制新审批流程图 截止 2026-06-16\n' +
        '@刘洋 #Action 编写流程改造需求文档 截止 6月17日\n' +
        '销售团队反馈积极，期望尽快落地。',
      decisions:
        '1. 选择钉钉+自研审批流结合方案\n' +
        '2. Bug管理工具选定Jira\n' +
        '3. @陈静 #Action 制定Jira实施计划 截止 6/20',
      participantIds: [1, 3, 4, 5],
      createdAt: '2026-06-11T10:00:00.000Z',
      updatedAt: '2026-06-11T10:00:00.000Z',
      deleted: 0,
    },
    {
      id: 7,
      title: 'Alpha v2.0 迭代一验收',
      projectId: 1,
      meetingDate: '2026-06-16',
      createdBy: 1,
      discussionPoints:
        '验收迭代一交付物，检查功能完整性。\n' +
        '@李娜 #Action 整理UI测试报告 截止 2026-06-18\n' +
        '@王磊 #Action 修复P0级别缺陷清单 截止 6月19日\n' +
        '@刘洋 #Action 性能测试并出报告 截止 2026-06-20\n' +
        '@张伟 #Action 准备客户演示材料 截止 6月25日',
      decisions:
        '1. 迭代一延期2天，6月20日正式交付\n' +
        '2. 增加额外一轮集成测试\n' +
        '3. 客户演示改到6月26日',
      participantIds: [1, 2, 3, 4],
      createdAt: '2026-06-16T10:00:00.000Z',
      updatedAt: '2026-06-16T10:00:00.000Z',
      deleted: 0,
    },
    {
      id: 8,
      title: 'Q3营销投放预热复盘',
      projectId: 2,
      meetingDate: '2026-06-17',
      createdBy: 5,
      discussionPoints:
        '复盘预热阶段数据，调整正式投放策略。\n' +
        '@陈静 #Action 汇总预热数据报告 截止 2026-06-20\n' +
        '@李娜 #Action 优化点击率低的素材 截止 6月21日\n' +
        '@张伟 #Action 追加短视频投放预算 截止 2026-06-22\n' +
        '预热期曝光量达标但转化率偏低。',
      decisions:
        '1. 加大短视频投放占比至60%\n' +
        '2. A/B测试2套不同CTA文案\n' +
        '3. @刘洋 #Action 搭建落地页数据埋点 截止 6/23',
      participantIds: [1, 2, 4, 5],
      createdAt: '2026-06-17T15:00:00.000Z',
      updatedAt: '2026-06-17T15:00:00.000Z',
      deleted: 0,
    },
  ]

  const statuses: ActionStatus[] = ['todo', 'doing', 'done']

  const actionItems: ActionItem[] = [
    { id: 1, meetingId: 1, title: '完成用户权限模块PRD', assigneeId: 1, status: 'done', dueDate: '2026-05-30', createdAt: '2026-05-26T10:00:00.000Z', updatedAt: '2026-05-29T17:00:00.000Z' },
    { id: 2, meetingId: 1, title: '梳理竞品分析报告', assigneeId: 2, status: 'done', dueDate: '2026-06-02', createdAt: '2026-05-26T10:00:00.000Z', updatedAt: '2026-06-01T18:00:00.000Z' },
    { id: 3, meetingId: 1, title: '设计新版首页交互原型', assigneeId: 3, status: 'done', dueDate: '2026-06-05', createdAt: '2026-05-26T10:00:00.000Z', updatedAt: '2026-06-04T16:30:00.000Z' },
    { id: 4, meetingId: 1, title: '编写数据库迁移脚本', assigneeId: 4, status: 'doing', dueDate: '2026-06-10', createdAt: '2026-05-26T10:00:00.000Z', updatedAt: '2026-06-09T11:00:00.000Z' },
    { id: 5, meetingId: 2, title: '制定KOL合作清单', assigneeId: 5, status: 'done', dueDate: '2026-06-01', createdAt: '2026-05-28T14:00:00.000Z', updatedAt: '2026-05-31T15:00:00.000Z' },
    { id: 6, meetingId: 2, title: '设计社交媒体投放素材', assigneeId: 2, status: 'done', dueDate: '2026-06-08', createdAt: '2026-05-28T14:00:00.000Z', updatedAt: '2026-06-07T17:00:00.000Z' },
    { id: 7, meetingId: 2, title: '审核投放预算明细', assigneeId: 1, status: 'done', dueDate: '2026-06-05', createdAt: '2026-05-28T14:00:00.000Z', updatedAt: '2026-06-04T10:00:00.000Z' },
    { id: 8, meetingId: 3, title: '访谈销售团队记录痛点', assigneeId: 3, status: 'done', dueDate: '2026-06-06', createdAt: '2026-06-02T09:30:00.000Z', updatedAt: '2026-06-05T18:00:00.000Z' },
    { id: 9, meetingId: 3, title: '梳理现有审批流程文档', assigneeId: 4, status: 'done', dueDate: '2026-06-07', createdAt: '2026-06-02T09:30:00.000Z', updatedAt: '2026-06-06T16:00:00.000Z' },
    { id: 10, meetingId: 3, title: '调研3款Bug管理工具', assigneeId: 5, status: 'done', dueDate: '2026-06-12', createdAt: '2026-06-02T09:30:00.000Z', updatedAt: '2026-06-11T14:00:00.000Z' },
    { id: 11, meetingId: 4, title: '完成API接口文档初稿', assigneeId: 4, status: 'doing', dueDate: '2026-06-08', createdAt: '2026-06-04T10:30:00.000Z', updatedAt: '2026-06-10T10:00:00.000Z' },
    { id: 12, meetingId: 4, title: '搭建前端微前端框架', assigneeId: 3, status: 'doing', dueDate: '2026-06-15', createdAt: '2026-06-04T10:30:00.000Z', updatedAt: '2026-06-14T17:00:00.000Z' },
    { id: 13, meetingId: 4, title: '制定UI组件规范', assigneeId: 2, status: 'done', dueDate: '2026-06-10', createdAt: '2026-06-04T10:30:00.000Z', updatedAt: '2026-06-09T18:00:00.000Z' },
    { id: 14, meetingId: 4, title: '采购CDN加速服务', assigneeId: 1, status: 'todo', dueDate: '2026-06-18', createdAt: '2026-06-04T10:30:00.000Z', updatedAt: '2026-06-04T10:30:00.000Z' },
    { id: 15, meetingId: 5, title: '输出3套创意海报', assigneeId: 2, status: 'doing', dueDate: '2026-06-14', createdAt: '2026-06-09T14:00:00.000Z', updatedAt: '2026-06-13T15:00:00.000Z' },
    { id: 16, meetingId: 5, title: '撰写品牌故事文案', assigneeId: 5, status: 'done', dueDate: '2026-06-13', createdAt: '2026-06-09T14:00:00.000Z', updatedAt: '2026-06-12T17:00:00.000Z' },
    { id: 17, meetingId: 5, title: '联系媒体合作伙伴', assigneeId: 1, status: 'doing', dueDate: '2026-06-16', createdAt: '2026-06-09T14:00:00.000Z', updatedAt: '2026-06-15T11:00:00.000Z' },
    { id: 18, meetingId: 5, title: '协助制作短视频素材', assigneeId: 4, status: 'todo', dueDate: '2026-06-15', createdAt: '2026-06-09T14:00:00.000Z', updatedAt: '2026-06-09T14:00:00.000Z' },
    { id: 19, meetingId: 6, title: '绘制新审批流程图', assigneeId: 3, status: 'doing', dueDate: '2026-06-16', createdAt: '2026-06-11T10:00:00.000Z', updatedAt: '2026-06-15T16:00:00.000Z' },
    { id: 20, meetingId: 6, title: '编写流程改造需求文档', assigneeId: 4, status: 'todo', dueDate: '2026-06-17', createdAt: '2026-06-11T10:00:00.000Z', updatedAt: '2026-06-11T10:00:00.000Z' },
    { id: 21, meetingId: 6, title: '制定Jira实施计划', assigneeId: 5, status: 'todo', dueDate: '2026-06-20', createdAt: '2026-06-11T10:00:00.000Z', updatedAt: '2026-06-11T10:00:00.000Z' },
    { id: 22, meetingId: 7, title: '整理UI测试报告', assigneeId: 2, status: 'todo', dueDate: '2026-06-18', createdAt: '2026-06-16T10:00:00.000Z', updatedAt: '2026-06-16T10:00:00.000Z' },
    { id: 23, meetingId: 7, title: '修复P0级别缺陷清单', assigneeId: 3, status: 'todo', dueDate: '2026-06-19', createdAt: '2026-06-16T10:00:00.000Z', updatedAt: '2026-06-16T10:00:00.000Z' },
    { id: 24, meetingId: 7, title: '性能测试并出报告', assigneeId: 4, status: 'todo', dueDate: '2026-06-20', createdAt: '2026-06-16T10:00:00.000Z', updatedAt: '2026-06-16T10:00:00.000Z' },
    { id: 25, meetingId: 7, title: '准备客户演示材料', assigneeId: 1, status: 'todo', dueDate: '2026-06-25', createdAt: '2026-06-16T10:00:00.000Z', updatedAt: '2026-06-16T10:00:00.000Z' },
    { id: 26, meetingId: 8, title: '汇总预热数据报告', assigneeId: 5, status: 'todo', dueDate: '2026-06-20', createdAt: '2026-06-17T15:00:00.000Z', updatedAt: '2026-06-17T15:00:00.000Z' },
    { id: 27, meetingId: 8, title: '优化点击率低的素材', assigneeId: 2, status: 'todo', dueDate: '2026-06-21', createdAt: '2026-06-17T15:00:00.000Z', updatedAt: '2026-06-17T15:00:00.000Z' },
    { id: 28, meetingId: 8, title: '追加短视频投放预算', assigneeId: 1, status: 'todo', dueDate: '2026-06-22', createdAt: '2026-06-17T15:00:00.000Z', updatedAt: '2026-06-17T15:00:00.000Z' },
    { id: 29, meetingId: 8, title: '搭建落地页数据埋点', assigneeId: 4, status: 'todo', dueDate: '2026-06-23', createdAt: '2026-06-17T15:00:00.000Z', updatedAt: '2026-06-17T15:00:00.000Z' },
  ]

  const notifications: Notification[] = [
    { id: 1, userId: 1, type: 'meeting_created', title: '新会议创建', content: '会议「Alpha v2.0 需求评审会」已创建', relatedId: 1, read: 1, createdAt: '2026-05-26T10:05:00.000Z' },
    { id: 2, userId: 2, type: 'meeting_created', title: '新会议邀请', content: '您被邀请参加会议「Alpha v2.0 需求评审会」', relatedId: 1, read: 1, createdAt: '2026-05-26T10:05:00.000Z' },
    { id: 3, userId: 3, type: 'meeting_created', title: '新会议邀请', content: '您被邀请参加会议「Alpha v2.0 需求评审会」', relatedId: 1, read: 0, createdAt: '2026-05-26T10:05:00.000Z' },
    { id: 4, userId: 1, type: 'action_done', title: '任务完成提醒', content: '张伟完成了任务「完成用户权限模块PRD」', relatedId: 1, read: 1, createdAt: '2026-05-29T17:05:00.000Z' },
    { id: 5, userId: 5, type: 'meeting_created', title: '新会议邀请', content: '您被邀请参加会议「Q3营销渠道启动会」', relatedId: 2, read: 1, createdAt: '2026-05-28T14:05:00.000Z' },
    { id: 6, userId: 4, type: 'email_sent', title: '邮件已发送', content: '会议「Alpha v2.0 迭代一验收」的待办邮件已发送给参会人', relatedId: 7, read: 0, createdAt: '2026-06-16T16:00:00.000Z' },
    { id: 7, userId: 2, type: 'action_done', title: '任务完成提醒', content: '李娜完成了任务「制定UI组件规范」', relatedId: 13, read: 0, createdAt: '2026-06-09T18:05:00.000Z' },
    { id: 8, userId: 1, type: 'meeting_created', title: '新会议创建', content: '会议「Q3营销投放预热复盘」已创建', relatedId: 8, read: 0, createdAt: '2026-06-17T15:05:00.000Z' },
    { id: 9, userId: 5, type: 'meeting_created', title: '新会议创建', content: '您创建了会议「Q3营销投放预热复盘」', relatedId: 8, read: 1, createdAt: '2026-06-17T15:05:00.000Z' },
    { id: 10, userId: 4, type: 'meeting_created', title: '新会议邀请', content: '您被邀请参加会议「Q3营销投放预热复盘」', relatedId: 8, read: 0, createdAt: '2026-06-17T15:05:00.000Z' },
  ]

  return {
    users,
    projects,
    meetings,
    actionItems,
    notifications,
    nextIds: {
      users: 6,
      projects: 4,
      meetings: 9,
      actionItems: 30,
      notifications: 11,
    },
  }
}

function loadFromDisk(): DataStoreShape {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as DataStoreShape
      if (
        parsed &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.meetings) &&
        Array.isArray(parsed.actionItems) &&
        Array.isArray(parsed.notifications) &&
        parsed.nextIds
      ) {
        return parsed
      }
    }
  } catch {
  }
  const seed = buildSeedData()
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8')
  } catch {
  }
  return seed
}

function saveToDiskSync() {
  if (!storeInstance) return
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const tmp = DATA_FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(storeInstance, null, 2), 'utf-8')
    fs.renameSync(tmp, DATA_FILE)
  } catch (err) {
    console.error('[dataStore] save failed:', err)
  }
}

function scheduleSave() {
  pendingSave = true
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    if (pendingSave) {
      pendingSave = false
      saveToDiskSync()
    }
  }, 500)
}

export function getStore(): DataStoreShape {
  if (!storeInstance) {
    storeInstance = loadFromDisk()
  }
  return new Proxy(storeInstance, {
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value)
      scheduleSave()
      return result
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (
        prop !== 'nextIds' &&
        Array.isArray(value)
      ) {
        const arr = value as unknown[]
        return new Proxy(arr, {
          set(aTarget, aProp, aValue) {
            const aResult = Reflect.set(aTarget, aProp, aValue)
            scheduleSave()
            return aResult
          },
          deleteProperty(aTarget, aProp) {
            const dResult = Reflect.deleteProperty(aTarget, aProp)
            scheduleSave()
            return dResult
          },
        })
      }
      if (prop === 'nextIds' && typeof value === 'object' && value !== null) {
        return new Proxy(value as Record<string, number>, {
          set(nTarget, nProp, nValue) {
            const nResult = Reflect.set(nTarget, nProp, nValue)
            scheduleSave()
            return nResult
          },
        })
      }
      return value
    },
  })
}

export function forceSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  pendingSave = false
  saveToDiskSync()
}

export { nowISO }
