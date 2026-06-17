import api from './api';
import type { User, Project, Notification } from '../../shared/types';

export interface NotificationListResponse {
  items: Notification[];
  unreadCount: number;
}

export const usersApi = {
  async listUsers(): Promise<User[]> {
    return await api.get<User[]>('/users');
  },

  async listProjects(): Promise<Project[]> {
    return await api.get<Project[]>('/projects');
  },

  async listNotifications(userId: number): Promise<NotificationListResponse> {
    return await api.get<NotificationListResponse>(`/notifications`, { params: { userId } });
  },

  async markNotificationsRead(userId: number): Promise<{ marked: number }> {
    return await api.post<{ marked: number }>(`/notifications/read-all`, { userId });
  },
};

export default usersApi;
