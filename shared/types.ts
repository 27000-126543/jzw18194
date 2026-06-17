export interface User {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
  role: 'admin' | 'member';
}

export interface Project {
  id: number;
  name: string;
  color: string;
}

export type ActionStatus = 'todo' | 'doing' | 'done';

export interface ActionItem {
  id: number;
  meetingId: number;
  title: string;
  description?: string;
  assigneeId: number;
  assignee?: User;
  status: ActionStatus;
  dueDate?: string;
  overdue?: boolean;
  createdAt: string;
  updatedAt: string;
  fromHistory?: boolean;
  meetingTitle?: string;
  projectName?: string;
  projectColor?: string;
}

export interface Meeting {
  id: number;
  title: string;
  projectId: number;
  project?: Project;
  meetingDate: string;
  createdBy: number;
  creator?: User;
  discussionPoints: string;
  decisions: string;
  participantIds: number[];
  participants?: User[];
  actionItems?: ActionItem[];
  createdAt: string;
  updatedAt: string;
  deleted: 0 | 1;
  progress?: { todo: number; doing: number; done: number; total: number };
}

export interface Notification {
  id: number;
  userId: number;
  type: 'action_done' | 'meeting_created' | 'email_sent';
  title: string;
  content?: string;
  relatedId?: number;
  read: 0 | 1;
  createdAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  projectId: number;
  meetingDate: string;
  participantIds: number[];
  discussionPoints: string;
  decisions: string;
  includeActionIds?: number[];
  actionOverrides?: Array<{
    tempKey?: string;
    title: string;
    assigneeId: number;
    dueDate?: string;
    status?: ActionStatus;
    description?: string;
  }>;
}

export interface UpdateMeetingRequest extends Partial<CreateMeetingRequest> {
  deleted?: 0 | 1;
}

export interface UpdateActionRequest {
  status?: ActionStatus;
  assigneeId?: number;
  dueDate?: string;
  title?: string;
  description?: string;
}

export interface ParsedAction {
  tempKey: string;
  title: string;
  assigneeName: string;
  assigneeId?: number;
  dueDate?: string;
  status?: ActionStatus;
  description?: string;
  start: number;
  end: number;
}

export interface EmailSendRequest {
  ccCreator?: boolean;
  customNote?: string;
}

export interface SearchMeetingHit {
  id: number;
  title: string;
  projectName: string;
  projectColor: string;
  meetingDate: string;
  highlights: Array<{ field: string; snippet: string }>;
  matchedParticipants: User[];
}

export interface SearchActionHit {
  id: number;
  title: string;
  meetingTitle: string;
  meetingId: number;
  snippet: string;
  status: ActionStatus;
  assignee?: User;
}

export interface SearchResponse {
  meetings: SearchMeetingHit[];
  actions: SearchActionHit[];
}

export interface StatsResponse {
  totalMeetings: number;
  pendingActions: number;
  weeklyCompletionRate: number;
  overdueActions: number;
  weeklyDelta: { meetings: number; pending: number; completion: number; overdue: number };
}
